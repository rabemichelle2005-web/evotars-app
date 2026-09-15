# Railway build for the nginx public gateway.
#
# Bakes this fork's static/ assets into the image (Railway has no
# equivalent of the bind-mounted ./static volume used by compose.prod.yaml)
# and renders nginx/railway.conf.template with envsubst at container start,
# using nginx:alpine's built-in /etc/nginx/templates/ mechanism. Only the
# uppercase placeholders below (${PORT}, ${API_HOST}, ${WEBSITE_HOST}) are
# substituted - nginx's own runtime variables ($host, $scheme, etc.) are
# left untouched because they are not environment variables.

FROM nginx:alpine

COPY nginx/railway.conf.template /etc/nginx/templates/default.conf.template
COPY static /var/www/html
