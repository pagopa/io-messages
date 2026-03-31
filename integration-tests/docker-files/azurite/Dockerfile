FROM node:22.22.1-alpine@sha256:8094c002d08262dba12645a3b4a15cd6cd627d30bc782f53229a2ec13ee22a00

WORKDIR /opt/azurite

RUN pnpm install -g azurite@2.7.1

VOLUME /opt/azurite/folder

ENV executable azurite

CMD ["sh", "-c", "${executable} -l /opt/azurite/folder"]
