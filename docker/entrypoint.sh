#!/bin/sh
set -e

# Ensure Drupal's files directory is writable
chown -R www-data:www-data /var/www/html/backend/web/sites/default/files 2>/dev/null || true

DRUSH="/var/www/html/backend/vendor/bin/drush --root=/var/www/html/backend/web"
CONFIG_DIR="/var/www/html/backend/config"

# Only import config if the sync directory is non-empty.
# On a brand-new install with no exported config, skip cim to avoid the
# "import is empty" error. Once config is exported and committed, this runs
# automatically on every deploy.
if [ -n "$(ls -A $CONFIG_DIR 2>/dev/null)" ]; then
  echo "[entrypoint] Importing Drupal configuration..."
  $DRUSH cim --source="$CONFIG_DIR" -y --no-interaction
else
  echo "[entrypoint] Config sync directory is empty — skipping cim."
fi

echo "[entrypoint] Running database updates..."
$DRUSH updb -y --no-interaction

echo "[entrypoint] Clearing caches..."
$DRUSH cr

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
