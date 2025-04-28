import { GenerateOpts, MessageGeneratorRepository } from "@/domain/message.js";
import {
  FiscalCode,
  fiscalCodeSchema,
} from "io-messages-common/domain/fiscal-code";
import { Message, messageSchema } from "io-messages-common/domain/message";
import {
  MessageContent,
  MessageMetadata,
} from "io-messages-common/types/message";
import { ulid } from "ulid";
import { z } from "zod";

export class MessageGeneratorRepositoryAdapter
  implements MessageGeneratorRepository
{
  #generateContent(opts: GenerateOpts): MessageContent {
    return {
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
    };
  }

  #generateMetadata(): MessageMetadata {
    const id = ulid();
    return {
      createdAt: new Date().toISOString(),
      featureLevelType: "STANDARD",
      fiscalCode: this.#getRandomTestFiscalCode(),
      id,
      indexedId: id,
      isPending: Math.random() > 0.5,
      senderServiceId: ulid(),
      senderUserId: ulid(),
      timeToLiveSeconds: 3600,
    };
  }

  #getRandomTestFiscalCode(): FiscalCode {
    const testFiscalCodes = z
      .array(fiscalCodeSchema)
      .parse([
        "LVTEST00A00A195X",
        "LVTEST00A00A196X",
        "LVTEST00A00A197X",
        "LVTEST00A00A198X",
        "LVTEST00A00A199X",
      ]);

    return testFiscalCodes[Math.floor(Math.random() * testFiscalCodes.length)];
  }

  generate(count: number, opts: GenerateOpts): Message[] {
    return Array.from({ length: count }, () => {
      const metadata = this.#generateMetadata();
      return messageSchema.parse({
        content: this.#generateContent(opts),
        id: metadata.id,
        metadata,
      });
    });
  }
}
