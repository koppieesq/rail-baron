<?php

namespace Drupal\rail_baron_game;

/**
 * Loads and caches static game data from JSON files in the module's data/ dir.
 */
class DataLoader {

  private array $cache = [];

  private function load(string $filename): array {
    if (!array_key_exists($filename, $this->cache)) {
      $path = __DIR__ . '/../data/' . $filename;
      $this->cache[$filename] = json_decode(file_get_contents($path), TRUE);
    }
    return $this->cache[$filename];
  }

  public function getCities(): array {
    return $this->load('cities.json');
  }

  public function getRailroads(): array {
    return $this->load('railroads.json');
  }

  public function getRouteSegments(): array {
    // Strip the leading note object.
    return array_values(array_filter($this->load('routeSegments.json'), fn($s) => isset($s['city_a'])));
  }

  public function getDestinationTable(): array {
    return $this->load('destinationTable.json');
  }

  public function getPayoffMatrix(): array {
    return $this->load('payoffMatrix.json');
  }

  public function getCityByName(string $name): ?array {
    foreach ($this->getCities() as $city) {
      if ($city['name'] === $name) return $city;
    }
    return NULL;
  }

  public function getCityById(int $id): ?array {
    foreach ($this->getCities() as $city) {
      if ((int) $city['id'] === $id) return $city;
    }
    return NULL;
  }

  public function getRailroadByAbbr(string $abbr): ?array {
    foreach ($this->getRailroads() as $rr) {
      if ($rr['abbr'] === $abbr) return $rr;
    }
    return NULL;
  }

  /**
   * Returns the bidirectional route graph as an adjacency list.
   *
   * Shape: [cityName => [neighborName => ['movement_spaces' => N, 'railroad' => 'XX']]]
   */
  public function getRouteGraph(): array {
    if (array_key_exists('__graph', $this->cache)) {
      return $this->cache['__graph'];
    }

    $graph = [];
    foreach ($this->getRouteSegments() as $seg) {
      $data = ['movement_spaces' => $seg['movement_spaces'], 'railroad' => $seg['railroad']];
      $graph[$seg['city_a']][$seg['city_b']] = $data;
      $graph[$seg['city_b']][$seg['city_a']] = $data;
    }

    $this->cache['__graph'] = $graph;
    return $graph;
  }

  /**
   * Returns the payoff in dollars for an origin→destination pair.
   * Values in the matrix are stored in thousands.
   */
  public function getPayoff(int $originId, int $destId): int {
    $matrix = $this->getPayoffMatrix();
    $value = $matrix[(string) $originId][(string) $destId]
      ?? $matrix[(string) $destId][(string) $originId]
      ?? 0;
    return (int) ($value * 1000);
  }

}
