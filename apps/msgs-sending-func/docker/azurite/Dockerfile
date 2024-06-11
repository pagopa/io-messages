FROM node:20.11.1-alpine

WORKDIR /opt/azurite

RUN npm install -g azurite@2.7.1

VOLUME /opt/azurite/folder

ENV executable azurite

CMD ["sh", "-c", "${executable} -l /opt/azurite/folder"]
