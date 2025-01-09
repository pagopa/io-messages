FROM node:20.11.1@sha256:e06aae17c40c7a6b5296ca6f942a02e6737ae61bbbf3e2158624bb0f887991b5

WORKDIR /opt/cosmosdb

RUN npm install -g @zeit/cosmosdb-server

CMD ["sh", "-c", "cosmosdb-server -p 3000"]
