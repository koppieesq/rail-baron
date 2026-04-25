<?php

namespace Drupal\rail_baron_game;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Database\Connection;
use Drupal\Core\Session\AccountInterface;

/**
 * Manages Rail Baron game sessions and player state.
 */
class GameManager {

  public function __construct(
    private readonly Connection $database,
    private readonly AccountInterface $currentUser,
    private readonly TimeInterface $time,
  ) {}

  /**
   * Creates a new game and auto-joins the creating user.
   */
  public function createGame(int $maxPlayers = 4): array {
    if ($maxPlayers < 1 || $maxPlayers > 6) {
      throw new \InvalidArgumentException('max_players must be between 1 and 6.');
    }

    $joinCode = $this->generateJoinCode();
    $now = $this->time->getRequestTime();

    $gameId = (int) $this->database->insert('rail_baron_game')
      ->fields([
        'join_code' => $joinCode,
        'status' => 'waiting',
        'max_players' => $maxPlayers,
        'current_turn_uid' => 0,
        'created' => $now,
        'updated' => $now,
      ])
      ->execute();

    $this->addPlayer($gameId, (int) $this->currentUser->id(), 0);

    return $this->getGameState($gameId);
  }

  /**
   * Adds the current user to a game identified by join code.
   * Auto-starts the game if it reaches max_players after this join.
   */
  public function joinByCode(string $joinCode): array {
    $game = $this->database->select('rail_baron_game', 'g')
      ->fields('g')
      ->condition('join_code', strtoupper($joinCode))
      ->execute()
      ->fetchAssoc();

    if (!$game) {
      throw new \RuntimeException('Game not found.');
    }
    if ($game['status'] !== 'waiting') {
      throw new \RuntimeException('Game is no longer accepting players.');
    }

    $gameId = (int) $game['id'];
    $uid = (int) $this->currentUser->id();

    $existing = $this->database->select('rail_baron_player_state', 'ps')
      ->condition('game_id', $gameId)
      ->condition('uid', $uid)
      ->countQuery()->execute()->fetchField();

    if ($existing) {
      // Already in — just return current state.
      return $this->getGameState($gameId);
    }

    $count = (int) $this->database->select('rail_baron_player_state', 'ps')
      ->condition('game_id', $gameId)
      ->countQuery()->execute()->fetchField();

    if ($count >= (int) $game['max_players']) {
      throw new \RuntimeException('Game is full.');
    }

    $this->addPlayer($gameId, $uid, $count);

    // Auto-start when the game is now full.
    if ($count + 1 >= (int) $game['max_players']) {
      $this->doStartGame($gameId);
    }

    return $this->getGameState($gameId);
  }

  /**
   * Returns all open (waiting) games with their current player counts.
   */
  public function getOpenGames(): array {
    $query = $this->database->select('rail_baron_game', 'g');
    $query->fields('g', ['id', 'join_code', 'max_players', 'created']);
    $query->condition('g.status', 'waiting');
    $query->orderBy('g.created', 'DESC');
    $query->addJoin('LEFT', 'rail_baron_player_state', 'ps', 'ps.game_id = g.id');
    $query->addExpression('COUNT(ps.id)', 'player_count');
    $query->groupBy('g.id');
    $query->groupBy('g.join_code');
    $query->groupBy('g.max_players');
    $query->groupBy('g.created');

    $rows = $query->execute()->fetchAll(\PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
      $row['id'] = (int) $row['id'];
      $row['max_players'] = (int) $row['max_players'];
      $row['player_count'] = (int) $row['player_count'];
      $row['created'] = (int) $row['created'];
    }

    return $rows;
  }

  /**
   * Starts the game: assigns home cities and sets the first player's turn.
   *
   * Only the game creator (turn_order = 0) may start.
   */
  public function startGame(int $gameId): array {
    $game = $this->getGame($gameId);
    if ($game['status'] !== 'waiting') {
      throw new \RuntimeException('Game already started or finished.');
    }

    $players = $this->getPlayers($gameId);

    // Only the first-joined player (turn_order = 0) can start.
    $creator = $players[0];
    if ((int) $creator['uid'] !== (int) $this->currentUser->id()) {
      throw new \RuntimeException('Only the game creator can start the game.');
    }

    $this->doStartGame($gameId);
    return $this->getGameState($gameId);
  }

  /**
   * Core start logic: assigns home cities and activates the game.
   * No permission check — callers are responsible for authorization.
   */
  private function doStartGame(int $gameId): void {
    // Guard against double-start in race conditions.
    $game = $this->getGame($gameId);
    if ($game['status'] !== 'waiting') {
      return;
    }

    $players = $this->getPlayers($gameId);
    $creator = $players[0];

    $cityIds = range(1, 65);
    shuffle($cityIds);
    foreach ($players as $i => $player) {
      $this->database->update('rail_baron_player_state')
        ->fields([
          'home_city_id' => $cityIds[$i],
          'current_city_id' => $cityIds[$i],
          'updated' => $this->time->getRequestTime(),
        ])
        ->condition('id', $player['id'])
        ->execute();
    }

    $this->database->update('rail_baron_game')
      ->fields([
        'status' => 'active',
        'current_turn_uid' => $creator['uid'],
        'updated' => $this->time->getRequestTime(),
      ])
      ->condition('id', $gameId)
      ->execute();
  }

  /**
   * Updates the current player's state and optionally ends their turn.
   *
   * Accepted keys in $data:
   *   current_city_id, destination_city_id, origin_city_id,
   *   money, train_type, owned_railroads (array), end_turn (bool)
   */
  public function updatePlayerState(int $gameId, array $data): array {
    $uid = (int) $this->currentUser->id();
    $game = $this->getGame($gameId);

    if ($game['status'] !== 'active') {
      throw new \RuntimeException('Game is not active.');
    }
    if ((int) $game['current_turn_uid'] !== $uid) {
      throw new \RuntimeException('It is not your turn.');
    }

    $allowed = [
      'current_city_id', 'destination_city_id', 'origin_city_id',
      'money', 'train_type', 'owned_railroads',
    ];
    $fields = array_intersect_key($data, array_flip($allowed));

    if (isset($fields['owned_railroads'])) {
      $fields['owned_railroads'] = json_encode((array) $fields['owned_railroads']);
    }

    if (!empty($fields)) {
      $fields['updated'] = $this->time->getRequestTime();
      $this->database->update('rail_baron_player_state')
        ->fields($fields)
        ->condition('game_id', $gameId)
        ->condition('uid', $uid)
        ->execute();
    }

    if (!empty($data['end_turn'])) {
      $this->advanceTurn($gameId);
    }

    return $this->getGameState($gameId);
  }

  /**
   * Returns the full game state including all player states.
   */
  public function getGameState(int $gameId): array {
    $game = $this->getGame($gameId);
    if (!$game) {
      throw new \RuntimeException('Game not found.');
    }
    $game['players'] = $this->getPlayers($gameId);
    $game['current_uid'] = (int) $this->currentUser->id();
    // Cast numeric game fields so JSON strict-equality works in React.
    foreach (['id', 'current_turn_uid', 'max_players', 'created', 'updated'] as $f) {
      if (isset($game[$f])) $game[$f] = (int) $game[$f];
    }
    return $game;
  }

  /**
   * Finds a game by join code and returns its state.
   */
  public function findByJoinCode(string $joinCode): array {
    $game = $this->database->select('rail_baron_game', 'g')
      ->fields('g', ['id'])
      ->condition('join_code', strtoupper($joinCode))
      ->execute()
      ->fetchField();

    if (!$game) {
      throw new \RuntimeException('No game found with that join code.');
    }

    return $this->getGameState((int) $game);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private function getGame(int $gameId): ?array {
    $row = $this->database->select('rail_baron_game', 'g')
      ->fields('g')
      ->condition('id', $gameId)
      ->execute()
      ->fetchAssoc();
    return $row ?: NULL;
  }

  private function getPlayers(int $gameId): array {
    $query = $this->database->select('rail_baron_player_state', 'ps');
    $query->join('users_field_data', 'u', 'u.uid = ps.uid');
    $query->fields('ps');
    $query->addField('u', 'name', 'username');
    $query->condition('ps.game_id', $gameId);
    $query->orderBy('ps.turn_order');
    $rows = $query->execute()->fetchAllAssoc('id', \PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
      $row['owned_railroads'] = json_decode($row['owned_railroads'] ?? '[]', TRUE);
      // Cast numeric fields so JSON doesn't send them as strings.
      foreach (['id', 'game_id', 'uid', 'current_city_id', 'home_city_id',
                'destination_city_id', 'origin_city_id', 'money', 'turn_order'] as $int) {
        $row[$int] = (int) $row[$int];
      }
    }

    return array_values($rows);
  }

  private function addPlayer(int $gameId, int $uid, int $turnOrder): void {
    $this->database->insert('rail_baron_player_state')
      ->fields([
        'game_id' => $gameId,
        'uid' => $uid,
        'current_city_id' => 0,
        'home_city_id' => 0,
        'destination_city_id' => 0,
        'origin_city_id' => 0,
        'money' => 20000,
        'train_type' => 'standard',
        'owned_railroads' => '[]',
        'turn_order' => $turnOrder,
        'updated' => $this->time->getRequestTime(),
      ])
      ->execute();
  }

  private function advanceTurn(int $gameId): void {
    $players = $this->getPlayers($gameId);
    $game = $this->getGame($gameId);
    $uids = array_column($players, 'uid');
    $currentIndex = array_search((int) $game['current_turn_uid'], $uids);
    $nextUid = $uids[($currentIndex + 1) % count($uids)];

    $this->database->update('rail_baron_game')
      ->fields([
        'current_turn_uid' => $nextUid,
        'updated' => $this->time->getRequestTime(),
      ])
      ->condition('id', $gameId)
      ->execute();
  }

  private function generateJoinCode(): string {
    do {
      $code = strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
      $exists = $this->database->select('rail_baron_game', 'g')
        ->condition('join_code', $code)
        ->countQuery()->execute()->fetchField();
    } while ($exists);
    return $code;
  }

}
