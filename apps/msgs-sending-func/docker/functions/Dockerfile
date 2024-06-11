FROM functions-node-18

COPY . /usr/src/app

RUN func extensions install

RUN yarn install --immutable
RUN yarn build

CMD ["func", "start", "--javascript"]
