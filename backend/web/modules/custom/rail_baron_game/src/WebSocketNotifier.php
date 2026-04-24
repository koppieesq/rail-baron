<?php

namespace Drupal\rail_baron_game;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Log\LoggerInterface;

/**
 * Notifies the WebSocket relay server that a game's state has changed.
 *
 * Sends a fire-and-forget POST to the internal Node.js notify endpoint.
 * Failures are logged at debug level and never propagate to the caller —
 * the WS layer is optional; REST polling is the fallback.
 */
class WebSocketNotifier {

  private const NOTIFY_URL = 'http://127.0.0.1:4000/notify';

  public function __construct(
    private readonly ClientInterface $httpClient,
    private readonly LoggerInterface $logger,
  ) {}

  public function notify(int $gameId): void {
    try {
      $this->httpClient->post(self::NOTIFY_URL, [
        'json'    => ['game_id' => $gameId],
        'timeout' => 0.5,
      ]);
    }
    catch (GuzzleException | \Throwable $e) {
      $this->logger->debug(
        'WS notify skipped for game @id: @msg',
        ['@id' => $gameId, '@msg' => $e->getMessage()],
      );
    }
  }

}
