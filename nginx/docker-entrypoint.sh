#!/bin/sh

set -e

CERT_DIR=/etc/nginx/certs

ORIGIN_CERT="$CERT_DIR/origin.crt"
ORIGIN_KEY="$CERT_DIR/origin.key"

missing=0

for f in "$ORIGIN_CERT" "$ORIGIN_KEY"; do
    if [ ! -s "$f" ]; then
        echo "nginx: missing or empty certificate file: $f" >&2
        missing=1
    fi
done

if [ "$missing" -ne 0 ]; then
    echo "nginx: expected TLS certificate files in $CERT_DIR:" >&2
    echo "  origin.crt   TLS certificate" >&2
    echo "  origin.key   TLS private key" >&2
    exit 1
fi

exec nginx -g "daemon off;"