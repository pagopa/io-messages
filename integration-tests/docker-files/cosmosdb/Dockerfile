FROM node:22.22.1-alpine@sha256:8094c002d08262dba12645a3b4a15cd6cd627d30bc782f53229a2ec13ee22a00

WORKDIR /opt/cosmosdb

RUN pnpm install -g @zeit/cosmosdb-server

CMD ["sh", "-c", "cosmosdb-server -p 3000"]
