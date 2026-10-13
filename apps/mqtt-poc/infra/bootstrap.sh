#!/bin/sh
set -eu
install -d -o rabbitmq -g rabbitmq -m 0700 /etc/rabbitmq/poc
for filename in ca.pem broker.pem broker.key; do
  install -o rabbitmq -g rabbitmq -m 0600 "/poc/certs/$filename" "/etc/rabbitmq/poc/$filename"
done
install -o rabbitmq -g rabbitmq -m 0600 /poc/definitions.json /etc/rabbitmq/poc/definitions.json
exec /usr/local/bin/docker-entrypoint.sh "$@"
