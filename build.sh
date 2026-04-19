#!/bin/sh
# Build and push the rail-baron image.
# Requires .env.build in the repo root (gitignored).
set -e

if [ ! -f .env.build ]; then
  echo "Error: .env.build not found. Copy .env.build.example and fill in values."
  exit 1
fi

# Load build args from .env.build
export $(grep -v '^#' .env.build | xargs)

IMAGE=registry.digitalocean.com/koppie/rail-baron:latest

docker buildx build \
  --platform linux/amd64 \
  --build-arg REACT_APP_FEED_URL="$REACT_APP_FEED_URL" \
  --build-arg REACT_APP_API_URL="$REACT_APP_API_URL" \
  -t "$IMAGE" \
  --push \
  .

echo ""
echo "Pushed $IMAGE"
echo "To deploy: kubectl rollout restart deployment/rail-baron"
