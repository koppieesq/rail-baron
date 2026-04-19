#!/bin/sh
set -e

# Ensure Drupal's files directory is writable
chown -R www-data:www-data /var/www/html/backend/web/sites/default/files 2>/dev/null || true

DRUSH="/var/www/html/backend/vendor/bin/drush --root=/var/www/html/backend/web"

echo "[entrypoint] Importing Drupal configuration..."
$DRUSH cim -y --no-interaction

echo "[entrypoint] Running database updates..."
$DRUSH updb -y --no-interaction

echo "[entrypoint] Clearing caches..."
$DRUSH cr

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
