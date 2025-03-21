import { ContainerClient } from "@azure/storage-blob";
import { MessageContent } from "io-messages-common/types/message";
import { ulid } from "ulid";

type MessageContentWithIds = MessageContent & { messageId: string };

type GenerateManyOpts = {
  includeRemoteContents: boolean;
  includePayments: boolean;
};

export interface ContentLoader {
  load: (messageContents: MessageContentWithIds[]) => Promise<void>;
  generateMany: (count: number, opts: GenerateManyOpts) => MessageContent[];
}

export class BlobContentLoader implements ContentLoader {
  containerClient: ContainerClient;
  constructor(messageContainerClient: ContainerClient) {
    this.containerClient = messageContainerClient;
  }

  generateMany(count: number, opts: GenerateManyOpts): MessageContent[] {
    return Array.from({ length: count }, () => ({
      subject: "Lorem ipsum",
      require_secure_channels: false,
      markdown: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      third_party_data: opts.includeRemoteContents
        ? {
            id: ulid(),
            has_attachments: true,
            configuration_id: "00000000000000000000000000",
            has_remote_content: false,
          }
        : undefined,
      payment_data: opts.includePayments
        ? {
            amount: 20000,
            notice_number: "396600003529000000",
            invalid_after_due_date: false,
            payee: { fiscal_code: "00000000001" },
          }
        : undefined,
      due_date: new Date().toISOString(),
    }));
  }

  async load(messageContents: MessageContentWithIds[]): Promise<void> {
    Promise.all(
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
