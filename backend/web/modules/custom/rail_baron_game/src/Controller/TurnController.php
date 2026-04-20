<?php

namespace Drupal\rail_baron_game\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\rail_baron_game\TurnManager;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Handles in-turn game actions: destination roll, valid moves, move, purchase.
 */
class TurnController extends ControllerBase {

  public function __construct(private readonly TurnManager $turnManager) {}

  public static function create(ContainerInterface $container): static {
    return new static($container->get('rail_baron_game.turn_manager'));
  }

  /**
   * POST /api/game/{game_id}/roll-destination
   *
   * No request body needed — dice are rolled server-side.
   * Sets the player's destination_city_id and origin_city_id.
   */
  public function rollDestination(int $game_id): JsonResponse {
    try {
      return new JsonResponse(['data' => $this->turnManager->rollDestination($game_id)]);
    }
    catch (\RuntimeException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 400);
    }
    catch (\Throwable $e) {
      return new JsonResponse(['error' => 'Failed to roll destination.'], 500);
    }
  }

  /**
   * GET /api/game/{game_id}/valid-moves?roll=N
   *
   * Returns all cities reachable from the player's current city within N spaces.
   */
  public function validMoves(Request $request, int $game_id): JsonResponse {
    $roll = (int) $request->query->get('roll', 0);

    if ($roll < 2) {
      return new JsonResponse(['error' => 'Query parameter roll must be >= 2.'], 400);
    }

    try {
      return new JsonResponse(['data' => $this->turnManager->getValidMoves($game_id, $roll)]);
    }
    catch (\RuntimeException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 400);
    }
  }

  /**
   * POST /api/game/{game_id}/move
   *
   * Body: { "target_city": "Chicago", "roll": 7 }
   *
   * Validates the move, applies tolls, applies payoff if destination reached,
   * and checks the win condition.
   */
  public function executeMove(Request $request, int $game_id): JsonResponse {
    $body       = json_decode($request->getContent(), TRUE) ?? [];
    $targetCity = $body['target_city'] ?? '';
    $roll       = (int) ($body['roll'] ?? 0);

    if (!$targetCity) {
      return new JsonResponse(['error' => 'target_city is required.'], 400);
    }
    if ($roll < 2) {
      return new JsonResponse(['error' => 'roll must be >= 2.'], 400);
    }

    try {
      return new JsonResponse(['data' => $this->turnManager->executeMove($game_id, $targetCity, $roll)]);
    }
    catch (\RuntimeException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 400);
    }
    catch (\Throwable $e) {
      return new JsonResponse(['error' => 'Failed to execute move.'], 500);
    }
  }

  /**
   * POST /api/game/{game_id}/purchase
   *
   * Railroad: { "type": "railroad", "railroad": "SP" }
   * Train:    { "type": "train",    "train_type": "express" }
   */
  public function executePurchase(Request $request, int $game_id): JsonResponse {
    $body = json_decode($request->getContent(), TRUE) ?? [];

    if (empty($body['type'])) {
      return new JsonResponse(['error' => 'type is required (railroad or train).'], 400);
    }

    try {
      return new JsonResponse(['data' => $this->turnManager->executePurchase($game_id, $body)]);
    }
    catch (\RuntimeException | \InvalidArgumentException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 400);
    }
    catch (\Throwable $e) {
      return new JsonResponse(['error' => 'Failed to process purchase.'], 500);
    }
  }

}
