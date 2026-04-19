# ============================================================
# Stage 1: Build React frontend
# ============================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline

# REACT_APP_* vars are baked in at build time by CRA.
# Pass them via --build-arg when building the image.
ARG REACT_APP_API_URL
ARG REACT_APP_FEED_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_FEED_URL=$REACT_APP_FEED_URL

COPY frontend/ ./
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# ============================================================
# Stage 2: Install Drupal / Composer dependencies
# ============================================================
FROM php:8.4-fpm AS backend-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
        git curl unzip \
        libpng-dev libjpeg-dev libfreetype6-dev \
        libzip-dev libxml2-dev libicu-dev libonig-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql gd opcache intl mbstring zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html/backend

COPY backend/composer.json backend/composer.lock ./
RUN composer install \
        --no-dev \
        --optimize-autoloader \
        --no-interaction \
        --no-progress

COPY backend/ ./

# ============================================================
# Stage 3: Runtime — PHP-FPM + Nginx + Supervisord
# ============================================================
FROM php:8.4-fpm

RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx supervisor \
        libpng-dev libjpeg-dev libfreetype6-dev \
        libzip-dev libxml2-dev libicu-dev libonig-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql gd opcache intl mbstring zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# --- Nginx ---
COPY docker/nginx.conf /etc/nginx/nginx.conf

# --- Supervisord ---
COPY docker/supervisord.conf /etc/supervisor/conf.d/app.conf

# --- Application code ---
COPY --from=backend-builder /var/www/html/backend /var/www/html/backend
COPY --from=frontend-builder /app/frontend/build  /var/www/html/frontend

# Drupal writable dirs
RUN mkdir -p /var/www/html/backend/web/sites/default/files \
             /var/log/supervisor \
    && chown -R www-data:www-data \
        /var/www/html/backend/web/sites/default/files \
        /var/www/html/frontend

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Drupal on 80, React on 3000
EXPOSE 80 3000

ENTRYPOINT ["/entrypoint.sh"]
