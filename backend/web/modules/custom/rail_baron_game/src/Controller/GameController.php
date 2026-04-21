<?php

namespace Drupal\rail_baron_game\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\rail_baron_game\GameManager;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Handles game lifecycle endpoints: create, find, state, join, start.
 */
class GameController extends ControllerBase {

  public function __construct(private readonly GameManager $gameManager) {}

  public static function create(ContainerInterface $container): static {
    return new static($container->get('rail_baron_game.game_manager'));
  }

  /**
   * POST /api/game
   *
   * Body (JSON): { "max_players": 4 }
   */
  public function createGame(Request $request): JsonResponse {
    $body = $this->parseBody($request);
    $maxPlayers = (int) ($body['max_players'] ?? 4);

    try {
      $state = $this->gameManager->createGame($maxPlayers);
      return new JsonResponse(['data' => $state], 201);
    }
    catch (\InvalidArgumentException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 400);
    }
    catch (\Throwable $e) {
      $this->logger('rail_baron_game')->error('createGame failed: @msg', ['@msg' => $e->getMessage(), 'exception' => $e]);
      return new JsonResponse(['error' => 'Failed to create game.'], 500);
    }
  }

  /**
   * GET /api/game/find/{join_code}
   */
  public function find(string $join_code): JsonResponse {
    try {
      $state = $this->gameManager->findByJoinCode($join_code);
      return new JsonResponse(['data' => $state]);
    }
    catch (\RuntimeException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 404);
    }
  }

  /**
   * GET /api/game/{game_id}/state
   */
  public function getState(int $game_id): JsonResponse {
    try {
      $state = $this->gameManager->getGameState($game_id);
      return new JsonResponse(['data' => $state]);
    }
    catch (\RuntimeException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 404);
    }
  }

  /**
   * POST /api/game/{game_id}/join
   *
   * Body (JSON): { "join_code": "ABCDEF" }
   */
  public function join(Request $request, int $game_id): JsonResponse {
    $body = $this->parseBody($request);
    $joinCode = $body['join_code'] ?? '';

    if (empty($joinCode)) {
      return new JsonResponse(['error' => 'join_code is required.'], 400);
    }

    try {
      $state = $this->gameManager->joinByCode($joinCode);
      return new JsonResponse(['data' => $state]);
    }
    catch (\RuntimeException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 400);
    }
  }

  /**
   * POST /api/game/{game_id}/start
   */
  public function start(int $game_id): JsonResponse {
    try {
      $state = $this->gameManager->startGame($game_id);
      return new JsonResponse(['data' => $state]);
    }
    catch (\RuntimeException $e) {
      return new JsonResponse(['error' => $e->getMessage()], 403);
    }
  }

  private function parseBody(Request $request): array {
    $content = $request->getContent();
    if (empty($content)) {
      return [];
    }
    $decoded = json_decode($content, TRUE);
    return is_array($decoded) ? $decoded : [];
  }

}
