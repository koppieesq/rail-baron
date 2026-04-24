<?php

namespace Drupal\rail_baron_game;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Database\Connection;
use Drupal\Core\Session\AccountInterface;
use Drupal\rail_baron_game\Service\MovementService;

/**
 * Orchestrates all turn-based game actions: destination rolls, movement,
 * toll collection, payoffs, purchases, and win detection.
 */
class TurnManager {

  const WIN_AMOUNT        = 200000;
  const TOLL_PER_RAILROAD = 500;
  const TRAIN_COSTS       = ['express' => 4000, 'superchief' => 6000];

  public function __construct(
    private readonly Connection $database,
    private readonly GameManager $gameManager,
    private readonly AccountInterface $currentUser,
    private readonly DataLoader $dataLoader,
    private readonly MovementService $movementService,
    private readonly TimeInterface $time,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Rolls dice to assign a destination city to the current player.
   *
   * Uses the player's home city region to look up the destination table.
   * Stores destination_city_id and sets origin_city_id if not already set.
   *
   * @throws \RuntimeException
   */
  public function rollDestination(int $gameId): array {
    $state  = $this->gameManager->getGameState($gameId);
    $uid    = (int) $this->currentUser->id();
    $player = $this->findPlayer($state, $uid);
    $this->assertIsTurn($state, $uid);

    if ((int) $player['destination_city_id'] !== 0) {
      throw new \RuntimeException('You already have a destination assigned.');
    }

    if ((int) $player['home_city_id'] === 0) {
      throw new \RuntimeException('Home city not set — has the game started?');
    }

    $currentCity = $this->dataLoader->getCityById((int) $player['current_city_id']);
    $roll    = $this->doDestinationRoll($currentCity ? $currentCity['region'] : NULL);
    $destId  = $roll['destination_city_id'];
    $originId = (int) $player['origin_city_id'] ?: (int) $player['current_city_id'];

    $this->updatePlayerFields($gameId, $uid, [
      'destination_city_id' => $destId,
      'origin_city_id'      => $originId,
    ]);

    $result                    = $this->gameManager->getGameState($gameId);
    $result['destination_roll'] = $roll;
    return $result;
  }

  /**
   * Returns all cities reachable from the current player's city within $roll spaces.
   * Flags which move (if any) reaches the player's current destination.
   *
   * @throws \RuntimeException|\InvalidArgumentException
   */
  public function getValidMoves(int $gameId, int $roll): array {
    if ($roll < 2) {
      throw new \InvalidArgumentException('Roll must be at least 2.');
    }

    $state  = $this->gameManager->getGameState($gameId);
    $uid    = (int) $this->currentUser->id();
    $player = $this->findPlayer($state, $uid);
    $this->assertIsTurn($state, $uid);

    $currentCity = $this->dataLoader->getCityById((int) $player['current_city_id']);
    if (!$currentCity) {
      throw new \RuntimeException('Current city not set — has the game started?');
    }

    $moves  = $this->movementService->getValidMoves($currentCity['name'], $roll);
    $destId = (int) $player['destination_city_id'];

    foreach ($moves as &$move) {
      $move['is_destination'] = ($destId !== 0 && (int) $move['city_id'] === $destId);
    }

    return [
      'current_city' => $currentCity['name'],
      'roll'         => $roll,
      'valid_moves'  => $moves,
    ];
  }

  /**
   * Executes a movement action:
   *   1. Validates the target city is reachable within $roll spaces.
   *   2. Applies tolls for any opponent-owned railroads on the path.
   *   3. Updates the player's current city.
   *   4. Applies a payoff if the player has reached their destination.
   *   5. Checks the win condition.
   *
   * @throws \RuntimeException
   */
  public function executeMove(int $gameId, string $targetCity, int $roll): array {
    $state  = $this->gameManager->getGameState($gameId);
    $uid    = (int) $this->currentUser->id();
    $player = $this->findPlayer($state, $uid);
    $this->assertIsTurn($state, $uid);

    if ((int) $player['destination_city_id'] === 0) {
      throw new \RuntimeException('Roll for a destination before moving.');
    }

    $currentCity = $this->dataLoader->getCityById((int) $player['current_city_id']);
    if (!$currentCity) {
      throw new \RuntimeException('Current city not set.');
    }

    // Find shortest path and validate cost.
    $path = $this->movementService->getShortestPath($currentCity['name'], $targetCity);
    if (!$path) {
      throw new \RuntimeException("No route from {$currentCity['name']} to {$targetCity}.");
    }
    if ($path['total_cost'] > $roll) {
      throw new \RuntimeException(
        "{$targetCity} requires {$path['total_cost']} spaces but you only rolled {$roll}."
      );
    }

    // Tolls: charge moving player, credit railroad owners.
    $tolls          = $this->calculateTolls($path['segments'], $state['players'], $uid);
    $totalTollPaid  = array_sum($tolls);
    $this->applyMoneyDelta($gameId, $uid, -$totalTollPaid);
    foreach ($tolls as $ownerUid => $amount) {
      $this->applyMoneyDelta($gameId, $ownerUid, $amount);
    }

    // Move the player.
    $targetCityData = $this->dataLoader->getCityByName($targetCity);
    $newCityId      = $targetCityData ? (int) $targetCityData['id'] : 0;
    $this->updatePlayerFields($gameId, $uid, ['current_city_id' => $newCityId]);

    // Payoff if destination reached.
    $payoff = 0;
    if ($newCityId !== 0 && $newCityId === (int) $player['destination_city_id']) {
      $payoff = $this->dataLoader->getPayoff(
        (int) $player['origin_city_id'],
        (int) $player['destination_city_id']
      );
      $this->applyMoneyDelta($gameId, $uid, $payoff);
      $this->updatePlayerFields($gameId, $uid, [
        'destination_city_id' => 0,
        'origin_city_id'      => 0,
      ]);
    }

    // Win condition: at home city with enough money.
    $refreshed = $this->getPlayerFromDb($gameId, $uid);
    $won       = $this->checkWin($refreshed);
    if ($won) {
      $this->database->update('rail_baron_game')
        ->fields(['status' => 'finished', 'updated' => $this->time->getRequestTime()])
        ->condition('id', $gameId)
        ->execute();
    }

    $result               = $this->gameManager->getGameState($gameId);
    $result['move_summary'] = [
      'path'          => $path['cities'],
      'movement_cost' => $path['total_cost'],
      'tolls_paid'    => $totalTollPaid,
      'toll_details'  => $tolls,
      'payoff'        => $payoff,
      'won'           => $won,
    ];
    return $result;
  }

  /**
   * Executes a purchase during the current player's turn.
   *
   * Railroad purchase: { "type": "railroad", "railroad": "SP" }
   * Train upgrade:     { "type": "train",    "train_type": "express" }
   *
   * @throws \RuntimeException|\InvalidArgumentException
   */
  public function executePurchase(int $gameId, array $data): array {
    $state  = $this->gameManager->getGameState($gameId);
    $uid    = (int) $this->currentUser->id();
    $player = $this->findPlayer($state, $uid);
    $this->assertIsTurn($state, $uid);

    $type = $data['type'] ?? '';

    if ($type === 'railroad') {
      $abbr = $data['railroad'] ?? '';
      $cost = $this->getRailroadCost($abbr, $player, $state['players']);

      if ((int) $player['money'] < $cost) {
        throw new \RuntimeException("Not enough money. Need \${$cost}, have \${$player['money']}.");
      }

      $newRailroads = array_merge($player['owned_railroads'], [$abbr]);
      $this->updatePlayerFields($gameId, $uid, [
        'owned_railroads' => json_encode($newRailroads),
        'money'           => (int) $player['money'] - $cost,
      ]);
    }
    elseif ($type === 'train') {
      $targetType = $data['train_type'] ?? '';
      $cost       = $this->getTrainUpgradeCost($player['train_type'], $targetType);

      if ((int) $player['money'] < $cost) {
        throw new \RuntimeException("Not enough money. Need \${$cost}, have \${$player['money']}.");
      }

      $this->updatePlayerFields($gameId, $uid, [
        'train_type' => $targetType,
        'money'      => (int) $player['money'] - $cost,
      ]);
    }
    else {
      throw new \InvalidArgumentException("type must be 'railroad' or 'train'.");
    }

    return $this->gameManager->getGameState($gameId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private function assertIsTurn(array $state, int $uid): void {
    if ($state['status'] !== 'active') {
      throw new \RuntimeException('The game is not active.');
    }
    if ((int) $state['current_turn_uid'] !== $uid) {
      throw new \RuntimeException('It is not your turn.');
    }
  }

  private function findPlayer(array $state, int $uid): array {
    foreach ($state['players'] as $player) {
      if ((int) $player['uid'] === $uid) return $player;
    }
    throw new \RuntimeException('You are not a player in this game.');
  }

  private function doDestinationRoll(?string $currentRegion): array {
    $table = $this->dataLoader->getDestinationTable();

    for ($attempt = 0; $attempt < 20; $attempt++) {
      $parityDie = random_int(1, 6);
      $die1      = random_int(1, 6);
      $die2      = random_int(1, 6);
      $sum       = $die1 + $die2;
      $parity    = ($parityDie % 2 === 0) ? 'even' : 'odd';

      $row = $table[$parity][(string) $sum] ?? NULL;
      if (!$row) continue;

      // Use the row's designated region (roll_region) as the destination column.
      $targetRegion = $row['roll_region'];
      $destName     = $row[$targetRegion] ?? NULL;
      if (!$destName) continue;

      $city = $this->dataLoader->getCityByName($destName);
      if (!$city) continue;

      // Re-roll if the destination is in the same region as where the player is.
      if ($currentRegion !== NULL && $city['region'] === $currentRegion) {
        continue;
      }

      return [
        'parity_die'          => $parityDie,
        'die1'                => $die1,
        'die2'                => $die2,
        'sum'                 => $sum,
        'parity'              => $parity,
        'destination_name'    => $destName,
        'destination_city_id' => (int) $city['id'],
      ];
    }

    throw new \RuntimeException('Could not determine a valid destination after multiple attempts.');
  }

  /**
   * Calculates tolls owed. Returns [ownerUid => amount].
   * Each railroad is charged at most once per trip regardless of segments used.
   */
  private function calculateTolls(array $segments, array $players, int $movingUid): array {
    $railroadOwners = [];
    foreach ($players as $player) {
      foreach ($player['owned_railroads'] as $rr) {
        $railroadOwners[$rr] = (int) $player['uid'];
      }
    }

    $tolls   = [];
    $charged = [];
    foreach ($segments as $segment) {
      $rr = $segment['railroad'];
      if (isset($charged[$rr])) continue;
      $ownerUid = $railroadOwners[$rr] ?? NULL;
      if ($ownerUid && $ownerUid !== $movingUid) {
        $tolls[$ownerUid] = ($tolls[$ownerUid] ?? 0) + self::TOLL_PER_RAILROAD;
      }
      $charged[$rr] = TRUE;
    }

    return $tolls;
  }

  private function checkWin(array $player): bool {
    return (int) $player['current_city_id'] === (int) $player['home_city_id']
      && (int) $player['money'] >= self::WIN_AMOUNT;
  }

  private function getRailroadCost(string $abbr, array $player, array $allPlayers): int {
    $rr = $this->dataLoader->getRailroadByAbbr($abbr);
    if (!$rr) throw new \RuntimeException("Unknown railroad: {$abbr}.");

    if (in_array($abbr, $player['owned_railroads'], TRUE)) {
      throw new \RuntimeException("You already own {$abbr}.");
    }
    foreach ($allPlayers as $other) {
      if ((int) $other['uid'] !== (int) $player['uid']
        && in_array($abbr, $other['owned_railroads'], TRUE)) {
        throw new \RuntimeException("{$abbr} is owned by another player.");
      }
    }
    return (int) $rr['price'];
  }

  private function getTrainUpgradeCost(string $current, string $target): int {
    $paths = ['standard' => 'express', 'express' => 'superchief'];
    if (!isset(self::TRAIN_COSTS[$target])) {
      throw new \RuntimeException("Unknown train type: {$target}.");
    }
    if (($paths[$current] ?? '') !== $target) {
      throw new \RuntimeException("Cannot upgrade from {$current} to {$target}.");
    }
    return self::TRAIN_COSTS[$target];
  }

  private function applyMoneyDelta(int $gameId, int $uid, int $delta): void {
    $this->database->update('rail_baron_player_state')
      ->expression('money', 'money + :delta', [':delta' => $delta])
      ->condition('game_id', $gameId)
      ->condition('uid', $uid)
      ->execute();
  }

  private function updatePlayerFields(int $gameId, int $uid, array $fields): void {
    $fields['updated'] = $this->time->getRequestTime();
    $this->database->update('rail_baron_player_state')
      ->fields($fields)
      ->condition('game_id', $gameId)
      ->condition('uid', $uid)
      ->execute();
  }

  private function getPlayerFromDb(int $gameId, int $uid): array {
    $row = $this->database->select('rail_baron_player_state', 'ps')
      ->fields('ps')
      ->condition('game_id', $gameId)
      ->condition('uid', $uid)
      ->execute()
      ->fetchAssoc();

    if ($row) {
      $row['owned_railroads'] = json_decode($row['owned_railroads'] ?? '[]', TRUE);
      foreach (['id', 'game_id', 'uid', 'current_city_id', 'home_city_id',
                'destination_city_id', 'origin_city_id', 'money', 'turn_order'] as $f) {
        $row[$f] = (int) $row[$f];
      }
    }

    return $row ?: [];
  }

}
