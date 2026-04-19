#!/bin/sh
set -e

# Ensure Drupal's files directory is writable
chown -R www-data:www-data /var/www/html/backend/web/sites/default/files 2>/dev/null || true

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
