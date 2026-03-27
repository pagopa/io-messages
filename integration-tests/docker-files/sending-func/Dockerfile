FROM functions-node-22

COPY . /usr/src/app

RUN func extensions install

RUN pnpm install
RUN pnpm build

CMD ["func", "start", "--javascript"]
