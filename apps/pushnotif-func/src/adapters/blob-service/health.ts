import { ErrorInternal } from "../../domain/error";
import { BlobService } from "azure-storage";

export const blobServiceHealthcheck = async (
  service: BlobService,
): Promise<ErrorInternal | undefined> => {
  try {
    await new Promise((resolve, reject) => {
      service.getServiceProperties((error, _, response) => {
        if (!error && response.statusCode === 200) {
          resolve(true);
        } else {
          reject(error);
        }
      });
    });
  } catch (err) {
    return new ErrorInternal(`Healthcheck failed for storage account`, err);
  }
};
