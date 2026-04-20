<?php

namespace Drupal\rail_baron_game\Service;

use Drupal\rail_baron_game\DataLoader;

/**
 * Graph traversal service for player movement on the Rail Baron board.
 */
class MovementService {

  public function __construct(private readonly DataLoader $dataLoader) {}

  /**
   * Returns all cities reachable from $fromCity within $roll movement spaces.
   *
   * Each entry: ['city' => string, 'city_id' => int, 'movement_cost' => int]
   * Sorted by cost ascending.
   */
  public function getValidMoves(string $fromCity, int $roll): array {
    ['dist' => $dist] = $this->dijkstra($fromCity, $roll);
    unset($dist[$fromCity]);

    $result = [];
    foreach ($dist as $cityName => $cost) {
      $cityData = $this->dataLoader->getCityByName($cityName);
      $result[] = [
        'city'          => $cityName,
        'city_id'       => $cityData ? (int) $cityData['id'] : NULL,
        'movement_cost' => $cost,
      ];
    }

    usort($result, fn($a, $b) => $a['movement_cost'] <=> $b['movement_cost']);
    return $result;
  }

  /**
   * Returns the shortest path (fewest movement spaces) between two cities.
   *
   * Returns null if no path exists.
   * Result shape:
   *   [
   *     'cities'     => ['Boston', 'Albany', 'Buffalo'],
   *     'segments'   => [['from'=>'Boston','to'=>'Albany','railroad'=>'B&M','movement_spaces'=>4], ...],
   *     'total_cost' => 9,
   *   ]
   */
  public function getShortestPath(string $from, string $to): ?array {
    ['dist' => $dist, 'prev' => $prev] = $this->dijkstra($from);

    if (!isset($dist[$to])) return NULL;

    // Reconstruct path backwards from destination.
    $cities = [];
    $segments = [];
    $city = $to;
    while ($city !== $from) {
      [$prevCity, $segData] = $prev[$city];
      $cities[] = $city;
      $segments[] = array_merge($segData, ['from' => $prevCity, 'to' => $city]);
      $city = $prevCity;
    }
    $cities[] = $from;

    return [
      'cities'     => array_reverse($cities),
      'segments'   => array_reverse($segments),
      'total_cost' => $dist[$to],
    ];
  }

  /**
   * Dijkstra's algorithm on the route graph.
   *
   * @param string   $start   Starting city name.
   * @param int|null $maxCost If set, prunes paths beyond this cost.
   *
   * @return array ['dist' => [city => cost], 'prev' => [city => [prevCity, segData]]]
   */
  private function dijkstra(string $start, ?int $maxCost = NULL): array {
    $graph = $this->dataLoader->getRouteGraph();
    $dist  = [$start => 0];
    $prev  = [$start => NULL];
    $queue = [[$start, 0]]; // [city, cost]

    while (!empty($queue)) {
      usort($queue, fn($a, $b) => $a[1] <=> $b[1]);
      [$city, $cost] = array_shift($queue);

      if ($cost > ($dist[$city] ?? PHP_INT_MAX)) continue;

      foreach ($graph[$city] ?? [] as $neighbor => $data) {
        $newCost = $cost + $data['movement_spaces'];
        if ($maxCost !== NULL && $newCost > $maxCost) continue;
        if ($newCost < ($dist[$neighbor] ?? PHP_INT_MAX)) {
          $dist[$neighbor] = $newCost;
          $prev[$neighbor] = [$city, $data];
          $queue[] = [$neighbor, $newCost];
        }
      }
    }

    return ['dist' => $dist, 'prev' => $prev];
  }

}
