import { GetBlobByNameErrors } from "./errors.js";
import { MessageContentForExtract } from "./schema.js";

export interface MessageContentRepository {
  getBlobByName: (
    name: string,
  ) => Promise<GetBlobByNameErrors | MessageContentForExtract>;
}
