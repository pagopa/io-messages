import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import { CosmosClient } from "@azure/cosmos";
import { BlobServiceClient } from "@azure/storage-blob";
import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { noopLogger } from "@pagopa/hexagonal-core/adapters/logger";
import { Result, err, ok } from "neverthrow";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CryptoAdapter } from "../../../adapters/outbound/crypto/crypto.adapter.js";
import { MessageContentBlobAdapter } from "../../../adapters/outbound/message/message-content.adapter.js";
import { MessageMetadataCosmosAdapter } from "../../../adapters/outbound/message/message-metadata.adapter.js";
import { MessageStatusCosmosAdapter } from "../../../adapters/outbound/message/message-status.adapter.js";
import { RCConfigurationHttpClientAdapter } from "../../../adapters/outbound/rc-confguration/rc-configuration.js";
import { MalformedEntityError } from "../../ports/error.js";
import {
  MessageContent,
  MessageContentRepository,
} from "../../ports/message-content.js";
import {
  MessageMetadata,
  MessageMetadataRepository,
} from "../../ports/message-metadata.js";
import {
  MessageStatus,
  MessageStatusRepository,
} from "../../ports/message-status.js";
import { RCConfiguration } from "../../ports/rc-configuration.js";
import {
  computeThirdPartyProperties,
  getConfigurationIDFromMessageContent,
  makeGetMessagesByUserUseCase,
} from "../get-user-messages.use-case.js";

const aFiscalCode = "RSSMRA80A01H501U";
const aPnServiceId = "pn-service-id";

const ULID_A = "01JAQ4HYBR5JZCS6K0DT7M1EV8";
const ULID_B = "01JHYBR5JZCS6K0DT7M1EV8N2F";
const ULID_C = "01JR5JZCS6K0DT7M1EV8N2FW9P";
const ULID_D = "01JZCS6K0DT7M1EV8N2FW9P3GX";
const ULID_E = "01J6K0DT7M1EV8N2FW9P3GXAQ4";
const ULID_F = "01JDT7M1EV8N2FW9P3GXAQ4HYB";

// Valid ULIDs used as remote-content configuration ids (a separate namespace
// from the message ids above).
const RC_CONFIG_ID_A = "01HAQ4HYBR5JZCS6K0DT7M1EV8";
const RC_CONFIG_ID_B = "01HHYBR5JZCS6K0DT7M1EV8N2F";

const aMessageMetadata = (
  id: string,
  overrides: Partial<MessageMetadata> = {},
): MessageMetadata => ({
  createdAt: "2023-01-01T00:00:00.000Z",
  featureLevelType: "STANDARD",
  fiscalCode: aFiscalCode,
  id,
  indexedId: id,
  isPending: false,
  senderServiceId: "a-service-id",
  senderUserId: "a-user-id",
  timeToLiveSeconds: 3600,
  ...overrides,
});

const aMessageStatus = (
  messageId: string,
  overrides: Partial<MessageStatus> = {},
): MessageStatus => ({
  isArchived: false,
  isRead: false,
  messageId,
  status: "PROCESSED",
  updatedAt: "2023-01-01T00:00:00.000Z",
  version: 0,
  ...overrides,
});

const aMessageContent = (
  overrides: Partial<MessageContent> = {},
): MessageContent => ({
  markdown: "a".repeat(80),
  require_secure_channels: false,
  subject: "a valid subject",
  ...overrides,
});

const aThirdPartyData = (
  overrides: Partial<NonNullable<MessageContent["third_party_data"]>> = {},
): NonNullable<MessageContent["third_party_data"]> => ({
  configuration_id: RC_CONFIG_ID_A,
  has_attachments: false,
  has_remote_content: false,
  id: "tpd-id",
  ...overrides,
});

const anRCConfiguration = (
  overrides: Partial<RCConfiguration> = {},
): RCConfiguration => ({
  configurationId: RC_CONFIG_ID_A,
  description: "a description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS",
  id: "an-rc-id",
  isLollipopEnabled: false,
  name: "a name",
  userId: "a-user-id",
  ...overrides,
});

const contentMapOf = (
  entries: [
    string,
    Result<MessageContent, MalformedEntityError | NotFoundError>,
  ][],
): Map<string, Result<MessageContent, MalformedEntityError | NotFoundError>> =>
  new Map(entries);

const cosmosClient = new CosmosClient({
  endpoint: "https://localhost:8081/",
  key: "Zm9v",
});
const blobServiceClient = BlobServiceClient.fromConnectionString(
  "DefaultEndpointsProtocol=https;AccountName=devstoreaccount1;AccountKey=Zm9v;BlobEndpoint=https://localhost/devstoreaccount1;",
);

const messageMetadataRepository: MessageMetadataRepository =
  new MessageMetadataCosmosAdapter(
    cosmosClient,
    "a-database",
    "message-metadata",
    noopLogger,
    new CryptoAdapter(),
  );

const messageStatusRepository: MessageStatusRepository =
  new MessageStatusCosmosAdapter(
    cosmosClient,
    "a-database",
    "message-status",
    noopLogger,
  );

const messageContentRepository: MessageContentRepository =
  new MessageContentBlobAdapter(
    blobServiceClient,
    "message-content",
    noopLogger,
  );

const remoteContentConfigurationReposiory =
  new RCConfigurationHttpClientAdapter(new URL("http://localhost/rc-app"));

const serviceToRcMap = new Map<string, string>();

const trackEventMock = vi.fn();
const logger = {
  trackEvent: trackEventMock,
} as unknown as Logger;

const getMessagesByUser = makeGetMessagesByUserUseCase(
  messageMetadataRepository,
  messageStatusRepository,
  messageContentRepository,
  remoteContentConfigurationReposiory,
  aPnServiceId,
  serviceToRcMap,
  logger,
);

const baseInput = {
  archived: false,
  fiscalCode: aFiscalCode,
  pageSize: 2,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("makeGetMessagesByUserUseCase - pagination", () => {
  it("returns a single full page with no next when the messages fit into it", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(
      ok([aMessageMetadata(ULID_B), aMessageMetadata(ULID_A)]),
    );
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_B), aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [ULID_B, ok(aMessageContent())],
          [ULID_A, ok(aMessageContent())],
        ]),
      ),
    );

    const result = await getMessagesByUser(baseInput);
    expect(result.isOk()).toBe(true);

    const page = result._unsafeUnwrap();
    expect(page.items.map((i) => i.id)).toEqual([ULID_B, ULID_A]);
    expect(page.prev).toBe(ULID_B);
    expect(page.next).toBeUndefined();

    expect(
      messageMetadataRepository.getMessagesMetadataByUser,
    ).toHaveBeenCalledTimes(1);
    expect(
      messageMetadataRepository.getMessagesMetadataByUser,
    ).toHaveBeenCalledWith(aFiscalCode, 4, undefined, undefined);
  });

  it("sets next when a further page exists", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(
      ok([
        aMessageMetadata(ULID_D),
        aMessageMetadata(ULID_C),
        aMessageMetadata(ULID_B),
        aMessageMetadata(ULID_A),
      ]),
    );
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(
      ok([
        aMessageStatus(ULID_D),
        aMessageStatus(ULID_C),
        aMessageStatus(ULID_B),
        aMessageStatus(ULID_A),
      ]),
    );
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [ULID_D, ok(aMessageContent())],
          [ULID_C, ok(aMessageContent())],
        ]),
      ),
    );

    const result = await getMessagesByUser(baseInput);

    expect(result.isOk()).toBe(true);
    const page = result._unsafeUnwrap();
    expect(page.items.map((i) => i.id)).toEqual([ULID_D, ULID_C]);
    expect(page.prev).toBe(ULID_D);
    expect(page.next).toBe(ULID_C);
  });

  it("keeps fetching buffers until the page is filled with matching messages", async () => {
    vi.spyOn(messageMetadataRepository, "getMessagesMetadataByUser")
      .mockResolvedValueOnce(
        ok([
          aMessageMetadata(ULID_D),
          aMessageMetadata(ULID_C),
          aMessageMetadata(ULID_B),
          aMessageMetadata(ULID_A),
        ]),
      )
      .mockResolvedValueOnce(
        ok([aMessageMetadata(ULID_F), aMessageMetadata(ULID_E)]),
      );

    vi.spyOn(messageStatusRepository, "getLatestMessagesStatusByIds")
      .mockResolvedValueOnce(
        ok([
          aMessageStatus(ULID_D, { isArchived: true }),
          aMessageStatus(ULID_C, { isArchived: true }),
          aMessageStatus(ULID_B, { isArchived: true }),
          aMessageStatus(ULID_A, { isArchived: true }),
        ]),
      )
      .mockResolvedValueOnce(
        ok([aMessageStatus(ULID_F), aMessageStatus(ULID_E)]),
      );

    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [ULID_F, ok(aMessageContent())],
          [ULID_E, ok(aMessageContent())],
        ]),
      ),
    );

    const result = await getMessagesByUser(baseInput);

    expect(result.isOk()).toBe(true);
    const page = result._unsafeUnwrap();
    expect(page.items.map((i) => i.id)).toEqual([ULID_F, ULID_E]);
    expect(page.next).toBeUndefined();

    expect(
      messageMetadataRepository.getMessagesMetadataByUser,
    ).toHaveBeenCalledTimes(2);
    expect(
      messageMetadataRepository.getMessagesMetadataByUser,
    ).toHaveBeenNthCalledWith(1, aFiscalCode, 4, undefined, undefined);
    expect(
      messageMetadataRepository.getMessagesMetadataByUser,
    ).toHaveBeenNthCalledWith(2, aFiscalCode, 4, ULID_A, undefined);
  });

  it("returns an empty page when the user has no messages", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(ok([]));
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(ok(contentMapOf([])));

    const result = await getMessagesByUser(baseInput);

    expect(result.isOk()).toBe(true);
    const page = result._unsafeUnwrap();
    expect(page.items).toEqual([]);
    expect(page.prev).toBeUndefined();
    expect(page.next).toBeUndefined();
    expect(
      messageMetadataRepository.getMessagesMetadataByUser,
    ).toHaveBeenCalledTimes(1);
    expect(
      messageStatusRepository.getLatestMessagesStatusByIds,
    ).not.toHaveBeenCalled();
    expect(
      messageContentRepository.getMessagesContentByIds,
    ).toHaveBeenCalledTimes(1);
  });
});

describe("makeGetMessagesByUserUseCase - filtering", () => {
  it("only returns the messages matching the requested archived flag", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(
      ok([aMessageMetadata(ULID_B), aMessageMetadata(ULID_A)]),
    );
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(
      ok([
        aMessageStatus(ULID_B, { isArchived: true }),
        aMessageStatus(ULID_A, { isArchived: false }),
      ]),
    );
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(ok(contentMapOf([[ULID_B, ok(aMessageContent())]])));

    const result = await getMessagesByUser({ ...baseInput, archived: true });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().items.map((i) => i.id)).toEqual([ULID_B]);
  });

  it("ignores statuses that have no matching metadata", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(ok([aMessageMetadata(ULID_A)]));
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_A), aMessageStatus(ULID_B)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(ok(contentMapOf([[ULID_A, ok(aMessageContent())]])));

    const result = await getMessagesByUser(baseInput);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().items.map((i) => i.id)).toEqual([ULID_A]);
  });

  it("skips messages whose content is missing or malformed", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(
      ok([
        aMessageMetadata(ULID_C),
        aMessageMetadata(ULID_B),
        aMessageMetadata(ULID_A),
      ]),
    );
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(
      ok([
        aMessageStatus(ULID_C),
        aMessageStatus(ULID_B),
        aMessageStatus(ULID_A),
      ]),
    );
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [ULID_C, ok(aMessageContent())],
          [ULID_B, err(new MalformedEntityError("bad content"))],
        ]),
      ),
    );

    const result = await getMessagesByUser({ ...baseInput, pageSize: 5 });

    expect(result.isOk()).toBe(true);
    const page = result._unsafeUnwrap();
    expect(page.items).toHaveLength(1);
    expect(page.items.map((i) => i.id)).toEqual([ULID_C]);
    expect(page.prev).toBe(ULID_C);
  });
});

describe("makeGetMessagesByUserUseCase - message category", () => {
  it("tags EU Covid certificate messages as EU_COVID_CERT", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(ok([aMessageMetadata(ULID_A)]));
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [
            ULID_A,
            ok(aMessageContent({ eu_covid_cert: { auth_code: "code" } })),
          ],
        ]),
      ),
    );

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;
    expect(item).toMatchObject({ category: { tag: "EU_COVID_CERT" } });
  });

  it("tags third party messages from the PN service as PN", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(
      ok([aMessageMetadata(ULID_A, { senderServiceId: aPnServiceId })]),
    );
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [
            ULID_A,
            ok(
              aMessageContent({
                third_party_data: aThirdPartyData({
                  has_attachments: true,
                  has_remote_content: true,
                  id: "tpd-id",
                  original_receipt_date: "2023-01-01T00:00:00.000Z",
                  original_sender: "a sender",
                  summary: "a summary",
                }),
              }),
            ),
          ],
        ]),
      ),
    );
    vi.spyOn(
      remoteContentConfigurationReposiory,
      "getRemoteContentConfiguration",
    ).mockResolvedValue(ok(anRCConfiguration()));

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;
    expect(item).toMatchObject({
      category: {
        has_attachments: true,
        has_remote_content: true,
        id: "tpd-id",
        original_receipt_date: "2023-01-01T00:00:00.000Z",
        original_sender: "a sender",
        summary: "a summary",
        tag: "PN",
      },
      has_attachments: true,
    });
  });

  it("tags third party messages from a non PN service as GENERIC", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(
      ok([aMessageMetadata(ULID_A, { senderServiceId: "another-service-id" })]),
    );
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [
            ULID_A,
            ok(
              aMessageContent({
                third_party_data: aThirdPartyData({
                  has_attachments: false,
                  has_remote_content: false,
                  id: "tpd-id",
                }),
              }),
            ),
          ],
        ]),
      ),
    );
    vi.spyOn(
      remoteContentConfigurationReposiory,
      "getRemoteContentConfiguration",
    ).mockResolvedValue(ok(anRCConfiguration()));

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;
    expect(item).toMatchObject({ category: { tag: "GENERIC" } });
  });
});

describe("makeGetMessagesByUserUseCase - message category (payment)", () => {
  it("tags payment messages as PAYMENT building the rptId from payee and notice number", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(ok([aMessageMetadata(ULID_A)]));
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [
            ULID_A,
            ok(
              aMessageContent({
                payment_data: {
                  amount: 100,
                  invalid_after_due_date: false,
                  notice_number: "012345678901234567",
                  payee: { fiscal_code: "12345678901" },
                },
              }),
            ),
          ],
        ]),
      ),
    );

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;
    expect(item).toMatchObject({
      category: { rptId: "12345678901012345678901234567", tag: "PAYMENT" },
    });
  });

  it("builds the rptId with an empty payee prefix when the payee is missing", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(ok([aMessageMetadata(ULID_A)]));
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [
            ULID_A,
            ok(
              aMessageContent({
                payment_data: {
                  amount: 100,
                  invalid_after_due_date: false,
                  notice_number: "012345678901234567",
                },
              }),
            ),
          ],
        ]),
      ),
    );

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;
    expect(item).toMatchObject({
      category: { rptId: "012345678901234567", tag: "PAYMENT" },
    });
  });

  it("tags plain messages as GENERIC", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(ok([aMessageMetadata(ULID_A)]));
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(ok(contentMapOf([[ULID_A, ok(aMessageContent())]])));

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;
    expect(item).toMatchObject({ category: { tag: "GENERIC" } });
  });
});

describe("makeGetMessagesByUserUseCase - error handling", () => {
  it("returns the error raised while fetching the metadata", async () => {
    const anError = new TooManyRequestsError();
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(err(anError));

    const result = await getMessagesByUser(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(anError);
  });

  it("returns the error raised while fetching the statuses", async () => {
    const anError = new GenericError("cannot read statuses");
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(ok([aMessageMetadata(ULID_A)]));
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(err(anError));

    const result = await getMessagesByUser(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(anError);
  });

  it("returns the error raised while fetching the contents", async () => {
    const anError = new GenericError("cannot read contents");
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(ok([aMessageMetadata(ULID_A)]));
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(err(anError));

    const result = await getMessagesByUser(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(anError);
  });
});

const mockSingleMessage = (
  id: string,
  content: MessageContent,
  statusOverrides: Partial<MessageStatus> = {},
  metadataOverrides: Partial<MessageMetadata> = {},
): void => {
  vi.spyOn(
    messageMetadataRepository,
    "getMessagesMetadataByUser",
  ).mockResolvedValue(ok([aMessageMetadata(id, metadataOverrides)]));
  vi.spyOn(
    messageStatusRepository,
    "getLatestMessagesStatusByIds",
  ).mockResolvedValue(ok([aMessageStatus(id, statusOverrides)]));
  vi.spyOn(
    messageContentRepository,
    "getMessagesContentByIds",
  ).mockResolvedValue(ok(contentMapOf([[id, ok(content)]])));
};

describe("makeGetMessagesByUserUseCase - remote content (third_party_data)", () => {
  it("computes has_precondition=true from the RC configuration (ALWAYS) when the message has none", async () => {
    mockSingleMessage(
      ULID_A,
      aMessageContent({ third_party_data: aThirdPartyData() }),
      { isRead: false },
    );
    const getRCConfiguration = vi
      .spyOn(
        remoteContentConfigurationReposiory,
        "getRemoteContentConfiguration",
      )
      .mockResolvedValue(ok(anRCConfiguration({ hasPrecondition: "ALWAYS" })));

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;

    expect(item).toMatchObject({
      has_attachments: false,
      has_precondition: true,
    });
    expect(getRCConfiguration).toHaveBeenCalledWith(RC_CONFIG_ID_A);
  });

  it("uses the has_precondition from the message over the RC configuration", async () => {
    mockSingleMessage(
      ULID_A,
      aMessageContent({
        third_party_data: aThirdPartyData({ has_precondition: "NEVER" }),
      }),
    );
    vi.spyOn(
      remoteContentConfigurationReposiory,
      "getRemoteContentConfiguration",
    ).mockResolvedValue(ok(anRCConfiguration({ hasPrecondition: "ALWAYS" })));

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;

    expect(item).toMatchObject({ has_precondition: false });
  });

  it("computes has_precondition=true when RC hasPrecondition is ONCE and the message is unread", async () => {
    mockSingleMessage(
      ULID_A,
      aMessageContent({ third_party_data: aThirdPartyData() }),
      { isRead: false },
    );
    vi.spyOn(
      remoteContentConfigurationReposiory,
      "getRemoteContentConfiguration",
    ).mockResolvedValue(ok(anRCConfiguration({ hasPrecondition: "ONCE" })));

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;

    expect(item).toMatchObject({ has_precondition: true });
  });

  it("computes has_precondition=false when RC hasPrecondition is ONCE and the message is read", async () => {
    mockSingleMessage(
      ULID_A,
      aMessageContent({ third_party_data: aThirdPartyData() }),
      { isRead: true },
    );
    vi.spyOn(
      remoteContentConfigurationReposiory,
      "getRemoteContentConfiguration",
    ).mockResolvedValue(ok(anRCConfiguration({ hasPrecondition: "ONCE" })));

    const [item] = (await getMessagesByUser(baseInput))._unsafeUnwrap().items;

    expect(item).toMatchObject({ has_precondition: false });
  });

  it("resolves the configuration id from the SERVICE_TO_RC_MAP when the message has none", async () => {
    const mappedServiceId = "mapped-service-id";
    const localUseCase = makeGetMessagesByUserUseCase(
      messageMetadataRepository,
      messageStatusRepository,
      messageContentRepository,
      remoteContentConfigurationReposiory,
      aPnServiceId,
      new Map([[mappedServiceId, RC_CONFIG_ID_B]]),
      logger,
    );
    mockSingleMessage(
      ULID_A,
      aMessageContent({
        third_party_data: aThirdPartyData({ configuration_id: undefined }),
      }),
      {},
      { senderServiceId: mappedServiceId },
    );
    const getRCConfiguration = vi
      .spyOn(
        remoteContentConfigurationReposiory,
        "getRemoteContentConfiguration",
      )
      .mockResolvedValue(ok(anRCConfiguration()));

    const result = await localUseCase(baseInput);

    expect(result.isOk()).toBe(true);
    expect(getRCConfiguration).toHaveBeenCalledWith(RC_CONFIG_ID_B);
  });
});

describe("makeGetMessagesByUserUseCase - remote content errors and caching", () => {
  it("skips the message and tracks an event when the RC configuration is not found", async () => {
    mockSingleMessage(
      ULID_A,
      aMessageContent({ third_party_data: aThirdPartyData() }),
    );
    vi.spyOn(
      remoteContentConfigurationReposiory,
      "getRemoteContentConfiguration",
    ).mockResolvedValue(
      err(new NotFoundError("remote-content configuration", "not found")),
    );

    const result = await getMessagesByUser(baseInput);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().items).toEqual([]);
    expect(trackEventMock).toHaveBeenCalledWith({
      name: "GetMessagesByUserUseCase.getRemoteContentConfigurationResponse.failed.notFound",
      properties: {
        messageID: ULID_A,
        rcConfigurationID: RC_CONFIG_ID_A,
      },
    });
  });

  it("returns the error when the RC configuration fetch fails with a non NotFound error", async () => {
    const anError = new TooManyRequestsError();
    mockSingleMessage(
      ULID_A,
      aMessageContent({ third_party_data: aThirdPartyData() }),
    );
    vi.spyOn(
      remoteContentConfigurationReposiory,
      "getRemoteContentConfiguration",
    ).mockResolvedValue(err(anError));

    const result = await getMessagesByUser(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(anError);
  });

  it("rejects when the configuration id is missing both in the message and in the map", async () => {
    mockSingleMessage(
      ULID_A,
      aMessageContent({
        third_party_data: aThirdPartyData({ configuration_id: undefined }),
      }),
    );

    await expect(getMessagesByUser(baseInput)).rejects.toThrow(GenericError);
  });

  it("fetches the RC configuration only once for messages sharing the same configuration id", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(
      ok([aMessageMetadata(ULID_B), aMessageMetadata(ULID_A)]),
    );
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_B), aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [
            ULID_B,
            ok(aMessageContent({ third_party_data: aThirdPartyData() })),
          ],
          [
            ULID_A,
            ok(aMessageContent({ third_party_data: aThirdPartyData() })),
          ],
        ]),
      ),
    );
    const getRCConfiguration = vi
      .spyOn(
        remoteContentConfigurationReposiory,
        "getRemoteContentConfiguration",
      )
      .mockResolvedValue(ok(anRCConfiguration()));

    const result = await getMessagesByUser(baseInput);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().items).toHaveLength(2);
    expect(getRCConfiguration).toHaveBeenCalledTimes(1);
  });

  it("does not leak third party properties to non remote-content messages", async () => {
    vi.spyOn(
      messageMetadataRepository,
      "getMessagesMetadataByUser",
    ).mockResolvedValue(
      ok([aMessageMetadata(ULID_B), aMessageMetadata(ULID_A)]),
    );
    vi.spyOn(
      messageStatusRepository,
      "getLatestMessagesStatusByIds",
    ).mockResolvedValue(ok([aMessageStatus(ULID_B), aMessageStatus(ULID_A)]));
    vi.spyOn(
      messageContentRepository,
      "getMessagesContentByIds",
    ).mockResolvedValue(
      ok(
        contentMapOf([
          [
            ULID_B,
            ok(
              aMessageContent({
                third_party_data: aThirdPartyData({ has_attachments: true }),
              }),
            ),
          ],
          [ULID_A, ok(aMessageContent())],
        ]),
      ),
    );
    vi.spyOn(
      remoteContentConfigurationReposiory,
      "getRemoteContentConfiguration",
    ).mockResolvedValue(ok(anRCConfiguration({ hasPrecondition: "ALWAYS" })));

    const { items } = (await getMessagesByUser(baseInput))._unsafeUnwrap();

    expect(items[0]).toMatchObject({
      has_attachments: true,
      has_precondition: true,
      id: ULID_B,
    });
    expect(items[1].id).toBe(ULID_A);
    expect(items[1]).not.toHaveProperty("has_attachments");
    expect(items[1]).not.toHaveProperty("has_precondition");
  });
});

describe("getConfigurationIDFromMessageContent", () => {
  it("returns the configuration id from the message content when present", () => {
    expect(
      getConfigurationIDFromMessageContent(
        RC_CONFIG_ID_A,
        "a-service",
        new Map(),
      ),
    ).toBe(RC_CONFIG_ID_A);
  });

  it("falls back to the SERVICE_TO_RC_MAP when the message has no configuration id", () => {
    expect(
      getConfigurationIDFromMessageContent(
        undefined,
        "a-service",
        new Map([["a-service", RC_CONFIG_ID_B]]),
      ),
    ).toBe(RC_CONFIG_ID_B);
  });

  it("throws a GenericError when the id is missing everywhere", () => {
    expect(() =>
      getConfigurationIDFromMessageContent(undefined, "a-service", new Map()),
    ).toThrow(GenericError);
  });
});

describe("computeThirdPartyProperties", () => {
  it("returns undefined when the content is not a remote content message", () => {
    expect(
      computeThirdPartyProperties(
        aMessageContent(),
        anRCConfiguration(),
        false,
      ),
    ).toBeUndefined();
  });
});
