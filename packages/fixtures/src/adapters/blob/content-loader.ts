import { ContainerClient } from "@azure/storage-blob";
import { MessageContent } from "io-messages-common/types/message";
import { ulid } from "ulid";

type MessageContentWithIds = { messageId: string } & MessageContent;

interface GenerateManyOpts {
  includePayments: boolean;
  includeRemoteContents: boolean;
}

export interface ContentLoader {
  generateMany: (count: number, opts: GenerateManyOpts) => MessageContent[];
  load: (messageContents: MessageContentWithIds[]) => Promise<void>;
}

export class BlobContentLoader implements ContentLoader {
  containerClient: ContainerClient;
  constructor(messageContainerClient: ContainerClient) {
    this.containerClient = messageContainerClient;
  }

  generateMany(count: number, opts: GenerateManyOpts): MessageContent[] {
    return Array.from({ length: count }, () => ({
      due_date: new Date().toISOString(),
      markdown:
        "Lorem ipsum dolor sit amet, consectetur adipisci elit, sed eiusmod tempor incidunt ut labore et dolore magna aliqua.",
      payment_data: opts.includePayments
        ? {
            amount: 20000,
            invalid_after_due_date: false,
            notice_number: "396600003529000000",
            payee: { fiscal_code: "00000000001" },
          }
        : undefined,
      require_secure_channels: false,
      subject: "Lorem ipsum",
      third_party_data: opts.includeRemoteContents
        ? {
            configuration_id: "00000000000000000000000000",
            has_attachments: true,
            has_remote_content: false,
            id: ulid(),
          }
        : undefined,
    }));
  }

  async load(messageContents: MessageContentWithIds[]): Promise<void> {
    await Promise.all(
      messageContents.map((content) => {
        const stringContent = JSON.stringify(content);
        const blobClient = this.containerClient.getBlockBlobClient(
          `${content.messageId}.json`,
        );
        return blobClient.upload(stringContent, stringContent.length);
      }),
    );
  }
}
