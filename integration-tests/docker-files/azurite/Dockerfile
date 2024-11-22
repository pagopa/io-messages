FROM node:20.11.1-alpine@sha256:bf77dc26e48ea95fca9d1aceb5acfa69d2e546b765ec2abfb502975f1a2d4def

WORKDIR /opt/azurite

RUN npm install -g azurite@2.7.1

VOLUME /opt/azurite/folder

ENV executable azurite

CMD ["sh", "-c", "${executable} -l /opt/azurite/folder"]
