#!/bin/bash
set -e

# Drupal initialization — run once at startup via supervisord (program:drupal-init).
# Output is captured by supervisord and streamed to kubectl logs automatically.

# Ensure Drupal's files directory is writable
chown -R www-data:www-data /var/www/html/backend/web/sites/default/files 2>/dev/null || true

DRUSH="/var/www/html/backend/vendor/bin/drush --root=/var/www/html/backend/web"
CONFIG_DIR="/var/www/html/backend/config"

# Only import config if the sync directory is non-empty.
# On a brand-new install with no exported config, skip cim to avoid the
# "import is empty" error. Once config is exported and committed, this runs
# automatically on every deploy.
if [ -n "$(ls -A $CONFIG_DIR 2>/dev/null)" ]; then
  # Sync the site UUID from exported config so cim doesn't reject it.
  EXPORTED_UUID=$(grep "^uuid:" "$CONFIG_DIR/system.site.yml" 2>/dev/null | awk '{print $2}')
  if [ -n "$EXPORTED_UUID" ]; then
    echo "[drupal-init] Setting site UUID to match exported config: $EXPORTED_UUID"
    $DRUSH config-set "system.site" uuid "$EXPORTED_UUID" -y --no-interaction
  fi

  echo "[drupal-init] Importing Drupal configuration..."
  $DRUSH cim --source="$CONFIG_DIR" -y --no-interaction
else
  echo "[drupal-init] Config sync directory is empty — skipping cim."
fi

echo "[drupal-init] Running database updates..."
$DRUSH updb -y --no-interaction

echo "[drupal-init] Clearing caches..."
$DRUSH cr

echo "[drupal-init] Done."