FROM node:24.16.0-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mqtt-poc/package.json apps/mqtt-poc/package.json
RUN corepack enable && pnpm install --filter mqtt-poc --frozen-lockfile --ignore-scripts
COPY apps/mqtt-poc/src apps/mqtt-poc/src
COPY apps/mqtt-poc/tsconfig.json apps/mqtt-poc/tsconfig.json
RUN pnpm --filter mqtt-poc build
WORKDIR /app/apps/mqtt-poc
CMD ["node", "dist/server.js"]
