import { createApp } from "./app.js";

const { server } = createApp();

const start = async () => {
  const port = 3000;
  try {
    await server.listen({ port });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
