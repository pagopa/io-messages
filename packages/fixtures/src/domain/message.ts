import { Message } from "io-messages-common/domain/message";

export interface GenerateOpts {
  includePayments: boolean;
  includeRemoteContents: boolean;
}

export interface MessageRepository {
  loadMessage: (message: Message) => Promise<void>;
}

export interface MessageGeneratorRepository {
  generate: (count: number, opts: GenerateOpts) => Message[];
}
