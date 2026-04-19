<?php

namespace Drupal\rail_baron_game\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\rail_baron_game\GameManager;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Handles player state updates during a game.
 */
class PlayerController extends ControllerBase {

  public function __construct(private readonly GameManager $gameManager) {}

  public static function create(ContainerInterface $container): static {
    return new static($container->get('rail_baron_game.game_manager'));
  }

  /**
   * PATCH /api/game/{game_id}/player
   *
   * Body (JSON) — any combination of:
   * {
   *   "current_city_id": 13,
   *   "destination_city_id": 40,
   *   "origin_city_id": 13,
   *   "money": 35000,
   *   "train_type": "express",
   *   "owned_railroads": ["SP", "UP"],
   *   "end_turn": true
   * }
   */
  public function update(Request $request, int $game_id): JsonResponse {
    $content = $request->getContent();
    $data = json_decode($content, TRUE);

    if (!is_array($data) || empty($data)) {
      return new JsonResponse(['error' => 'Request body must be a JSON object.'], 400);
    }

    try {
      $state = $this->gameManager->updatePlayerState($game_id, $data);
      return new JsonResponse(['data' => $state]);
    }
    catch (\RuntimeException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 403);
    }
    catch (\Throwable $e) {
      return new JsonResponse(['error' => 'Failed to update player state.'], 500);
    }
  }

}
