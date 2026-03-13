import { HttpHandler } from "@azure/functions";

// TODO: Add healthcheck to resources
export const getInfoHandler = (): HttpHandler => () => ({ body: "It works" });
