FROM node:20.11.1-alpine@sha256:bf77dc26e48ea95fca9d1aceb5acfa69d2e546b765ec2abfb502975f1a2d4def

WORKDIR /opt/cosmosdb

RUN apk add git
RUN npm install -g ts-node typescript && \
    npm install documentdb @types/documentdb io-functions-commons \
    io-ts@1.8.5 fp-ts@1.12.0 @pagopa/ts-commons

COPY docker/fixtures/index.ts /opt/cosmosdb

CMD ["sh", "-c", "ts-node index"]
