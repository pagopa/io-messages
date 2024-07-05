import { HttpFunctionOptions } from "@azure/functions";

const health = (): HttpFunctionOptions => ({
  authLevel: "anonymous",
  handler: () => ({
    body: "it works!",
  }),
  methods: ["GET"],
  route: "health",
});

export default health;
