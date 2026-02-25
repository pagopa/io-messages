import { CosmosDBHandler, InvocationContext } from "@azure/functions";

const getUpdateInstallationsHandler =
  (
    useCase: any, // TODO: use use case type
  ): CosmosDBHandler =>
  async (documents: unknown[], context: InvocationContext) => {
    console.log("cosmos trigger handler");
    console.log(documents);
  };

export default getUpdateInstallationsHandler;
