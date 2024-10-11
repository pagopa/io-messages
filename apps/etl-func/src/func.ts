import { app } from "@azure/functions";

app.http("Health", {
  authLevel: "anonymous",
  handler: () => ({
    body: "it works!",
  }),
  methods: ["GET"],
  route: "health",
});
