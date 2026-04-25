#!/bin/bash
set -e

# Drupal initialization — run once at startup via supervisord (program:drupal-init).
# Output is captured by supervisord and streamed to kubectl logs automatically.

# Signal to the Kubernetes liveness probe that the container is alive.
# Written immediately so the probe never trips during the drush init phase.
touch /tmp/drupal-live

# Ensure Drupal's files directory is writable
chown -R www-data:www-data /var/www/html/backend/web/sites/default/files 2>/dev/null || true

DRUSH="/var/www/html/backend/vendor/bin/drush --root=/var/www/html/backend/web"
CONFIG_DIR="/var/www/html/backend/config"

# Generate Simple OAuth RSA key pair once per container (secrets, not committed to git).
OAUTH_KEY_DIR="/var/www/html/backend/web/sites/default/files/private/oauth"
mkdir -p "$OAUTH_KEY_DIR"
if [ ! -f "$OAUTH_KEY_DIR/private.key" ]; then
  echo "[drupal-init] Generating Simple OAuth RSA key pair..."
  openssl genrsa -out "$OAUTH_KEY_DIR/private.key" 2048
  openssl rsa -in "$OAUTH_KEY_DIR/private.key" -pubout -out "$OAUTH_KEY_DIR/public.key"
  chmod 600 "$OAUTH_KEY_DIR/private.key"
  chown www-data:www-data "$OAUTH_KEY_DIR/private.key" "$OAUTH_KEY_DIR/public.key"
fi

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

# Seed the Simple OAuth consumer entity after updb so the consumers table exists.
echo "[drupal-init] Ensuring Rail Baron App OAuth consumer exists..."
$DRUSH eval "
  \$s = \Drupal::entityTypeManager()->getStorage('consumer');
  if (!\$s->loadByProperties(['client_id' => 'rail_baron_app'])) {
    \$s->create([
      'label'                   => 'Rail Baron App',
      'client_id'               => 'rail_baron_app',
      'is_default'              => TRUE,
      'access_token_expiration' => 86400,
    ])->save();
    echo '[drupal-init] Consumer created.' . PHP_EOL;
  } else {
    echo '[drupal-init] Consumer already exists.' . PHP_EOL;
  }
" || true

echo "[drupal-init] Clearing caches..."
$DRUSH cr

echo "[drupal-init] Done."

# Signal to the Kubernetes readiness probe that initialisation is complete.
touch /tmp/drupal-ready