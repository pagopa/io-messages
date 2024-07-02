import { app } from "@azure/functions";

app.http("Health", {
  authLevel: "anonymous",
  handler: () => ({ body: "hello" }),
  methods: ["GET"],
  route: "health",
});
