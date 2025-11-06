#!/bin/bash

# Initialize Let's Encrypt SSL certificates
# Usage: ./scripts/init-letsencrypt.sh

set -e

# Configuration
DOMAIN="api.whatsapp-crm.com"
EMAIL="admin@whatsapp-crm.com"
STAGING=0  # Set to 1 for testing

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Initializing Let's Encrypt SSL certificates${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check if domain is set
if [ "$DOMAIN" = "api.whatsapp-crm.com" ]; then
  echo -e "${YELLOW}Warning: Using default domain. Please update DOMAIN variable in this script.${NC}"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Create directories
echo "Creating directories..."
mkdir -p certbot/conf
mkdir -p certbot/www

# Download recommended TLS parameters
if [ ! -e "certbot/conf/options-ssl-nginx.conf" ] || [ ! -e "certbot/conf/ssl-dhparams.pem" ]; then
  echo "Downloading recommended TLS parameters..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
fi

# Create dummy certificate
echo "Creating dummy certificate for $DOMAIN..."
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
mkdir -p "certbot/conf/live/$DOMAIN"
docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout '$CERT_PATH/privkey.pem' \
    -out '$CERT_PATH/fullchain.pem' \
    -subj '/CN=localhost'" certbot

# Start nginx
echo "Starting nginx..."
docker-compose -f docker-compose.prod.yml up -d nginx

# Delete dummy certificate
echo "Deleting dummy certificate for $DOMAIN..."
docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

# Request Let's Encrypt certificate
echo "Requesting Let's Encrypt certificate for $DOMAIN..."

# Set staging flag
STAGING_ARG=""
if [ $STAGING != "0" ]; then
  STAGING_ARG="--staging"
  echo -e "${YELLOW}Using Let's Encrypt staging server${NC}"
fi

docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN" certbot

# Reload nginx
echo "Reloading nginx..."
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo -e "${GREEN}✅ SSL certificate successfully obtained!${NC}"
echo ""
echo "Next steps:"
echo "1. Update your DNS records to point $DOMAIN to this server"
echo "2. Restart the services: docker-compose -f docker-compose.prod.yml restart"
echo "3. Test your SSL: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
