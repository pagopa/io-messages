FROM functions-node-20

COPY . /usr/src/app

RUN func extensions install --javascript

RUN yarn install
RUN yarn build

CMD ["func", "start", "--javascript"]
