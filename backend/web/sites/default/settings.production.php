<?php

/**
 * Production settings — reads everything from environment variables.
 * Set these as Kubernetes Secrets / ConfigMap entries.
 */

// Database — DigitalOcean Managed MySQL
$databases['default']['default'] = [
  'driver'    => 'mysql',
  'database'  => getenv('DB_NAME')     ?: 'drupal',
  'username'  => getenv('DB_USER')     ?: 'drupal',
  'password'  => getenv('DB_PASSWORD') ?: '',
  'host'      => getenv('DB_HOST')     ?: '127.0.0.1',
  'port'      => getenv('DB_PORT')     ?: '3306',
  'prefix'    => '',
  'collation' => 'utf8mb4_general_ci',
  'namespace' => 'Drupal\\mysql\\Driver\\Database\\mysql',
  'autoload'  => 'core/modules/mysql/src/Driver/Database/mysql/',
];

// DigitalOcean managed DBs require SSL — mount the CA cert and set DB_SSL_CA.
if (getenv('DB_SSL_CA')) {
  $databases['default']['default']['pdo'] = [
    \PDO::MYSQL_ATTR_SSL_CA                => getenv('DB_SSL_CA'),
    \PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => FALSE,
  ];
}

// Hash salt — generate with:
//   drush php-eval 'echo \Drupal\Component\Utility\Crypt::randomBytesBase64(55)'
$settings['hash_salt'] = getenv('DRUPAL_HASH_SALT') ?: 'CHANGEME';

// Trusted host patterns — comma-separated regexes, e.g. "^rb\.example\.com$"
if (getenv('TRUSTED_HOST_PATTERNS')) {
  $settings['trusted_host_patterns'] = array_filter(
    explode(',', getenv('TRUSTED_HOST_PATTERNS'))
  );
}

// Config sync directory
$settings['config_sync_directory'] = '../config/sync';

// Performance
$config['system.performance']['css']['preprocess'] = TRUE;
$config['system.performance']['js']['preprocess']  = TRUE;
