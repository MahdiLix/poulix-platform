FROM node:22-bookworm-slim

# nginx: reverse proxy and TLS termination on 80/443.
# Origin Certificate files are mounted at /etc/nginx/certs at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx \
  && rm -rf /var/lib/apt/lists/* \
  && rm -f /etc/nginx/sites-enabled/default \
  && mkdir -p /etc/nginx/certs

COPY nginx.conf /etc/nginx/nginx.conf
COPY proxy_locations.conf /etc/nginx/proxy_locations.conf
COPY ssl_params.conf /etc/nginx/ssl_params.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443
CMD ["/docker-entrypoint.sh"]
