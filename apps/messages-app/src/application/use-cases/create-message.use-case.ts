import type { Logger } from "@pagopa/hexagonal-core/domain/ports";
import type { FiscalCode } from "io-messages-common/domain/fiscal-code";
import type { MessageId } from "io-messages-common/domain/message";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  UseCase,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { type Result, err, ok } from "neverthrow";
import { BlockList } from "node:net";
import { ulid } from "ulid";

import type { ClientIp } from "../../domain/client-ip.js";
import type { MessageCreatedEventPublisher } from "../ports/message-created-event.js";
import type {
  MessageMetadata,
  MessageMetadataRepository,
} from "../ports/message-metadata.js";
import type { ProcessingMessagePayloadStore } from "../ports/processing-message.js";
import type { RCConfigurationRepository } from "../ports/rc-configuration.js";
import type {
  ServicesCmsDetail,
  ServicesCmsRepository,
} from "../ports/services-cms.js";

import {
  type CreateMessagePermission,
  type CreatedMessage,
  type NewMessage,
  createMessagePermissionSchema,
} from "../ports/create-message.js";

export interface CreateMessageInput {
  clientIp: ClientIp;
  fiscalCode?: FiscalCode;
  message: NewMessage;
  permissions: ReadonlySet<CreateMessagePermission>;
  subscriptionId: string;
  userEmail: string;
  userId: string;
}

export type CreateMessageError =
  | ForbiddenError
  | GenericError
  | NotFoundError
  | TooManyRequestsError
  | ValidationError;

export type CreateMessageUseCase = UseCase<
  CreateMessageInput,
  CreatedMessage,
  CreateMessageError
>;

type MessageIdGenerator = () => MessageId;
type Clock = () => Date;

const validatePayloadPermissions = (
  message: NewMessage,
  permissions: ReadonlySet<CreateMessagePermission>,
): Result<void, ForbiddenError> => {
  if (
    message.content.eu_covid_cert &&
    !permissions.has(
      createMessagePermissionSchema.enum.ApiMessageWriteEUCovidCert,
    )
  ) {
    return err(new ForbiddenError());
  }

  if (
    message.content.payment_data?.payee &&
    !permissions.has(
      createMessagePermissionSchema.enum.ApiMessageWriteWithPayee,
    )
  ) {
    return err(new ForbiddenError());
  }

  if (
    message.feature_level_type === "ADVANCED" &&
    !permissions.has(createMessagePermissionSchema.enum.ApiMessageWriteAdvanced)
  ) {
    return err(new ForbiddenError());
  }

  // The legacy third-party codec only matches STANDARD messages. Keep this
  // behavior so ADVANCED third-party messages do not require both permissions.
  if (
    message.content.third_party_data &&
    message.feature_level_type === "STANDARD" &&
    !permissions.has(
      createMessagePermissionSchema.enum.ApiThirdPartyMessageWrite,
    )
  ) {
    return err(new ForbiddenError());
  }

  return ok(undefined);
};

const validateClientIp = (
  clientIp: ClientIp,
  authorizedCidrs: readonly string[],
): Result<void, ForbiddenError> => {
  // As in services-func, an empty allowlist means that the service does not
  // restrict message creation by source IP.
  if (authorizedCidrs.length === 0) {
    return ok(undefined);
  }

  const blockList = new BlockList();
  for (const cidr of authorizedCidrs) {
    // BlockList expects address and prefix separately. The legacy
    // implementation treats an address without a prefix as a single-host /32.
    const separatorIndex = cidr.lastIndexOf("/");
    const address =
      separatorIndex === -1 ? cidr : cidr.slice(0, separatorIndex);
    const prefixLength =
      separatorIndex === -1 ? 32 : Number(cidr.slice(separatorIndex + 1));
    blockList.addSubnet(address, prefixLength, "ipv4");
  }

  // ClientIp is already validated by its schema. Here the colon only selects
  // the address family required by BlockList; it does not validate it again.
  const clientIpFamily = clientIp.includes(":") ? "ipv6" : "ipv4";
  return blockList.check(clientIp, clientIpFamily)
    ? ok(undefined)
    : err(new ForbiddenError());
};

const getService = async (
  subscriptionId: string,
  servicesCmsRepository: ServicesCmsRepository,
): Promise<
  Result<
    ServicesCmsDetail,
    ForbiddenError | GenericError | TooManyRequestsError
  >
> => {
  const serviceDetails =
    await servicesCmsRepository.getServicesCmsDetailsByServiceIds([
      subscriptionId,
    ]);

  if (serviceDetails.isErr()) {
    return err(serviceDetails.error);
  }

  const serviceDetail = serviceDetails.value.get(subscriptionId);
  if (!serviceDetail || serviceDetail.isErr()) {
    if (!serviceDetail || serviceDetail.error instanceof NotFoundError) {
      return err(new ForbiddenError());
    }

    return err(
      new GenericError(
        `invalid service detail for subscription ${subscriptionId}: ${serviceDetail.error.message}`,
      ),
    );
  }

  return ok(serviceDetail.value);
};

const getFiscalCode = (
  pathFiscalCode: FiscalCode | undefined,
  payloadFiscalCode: FiscalCode | undefined,
): Result<FiscalCode, ValidationError> => {
  if (pathFiscalCode && payloadFiscalCode) {
    return err(
      new ValidationError(
        "Bad parameters: The fiscalcode parameter must be specified in the path or in the payload but not in both",
      ),
    );
  }

  const fiscalCode = pathFiscalCode ?? payloadFiscalCode;
  return fiscalCode
    ? ok(fiscalCode)
    : err(
        new ValidationError(
          "Bad parameters: The fiscalcode parameter must be specified in the path or in the payload",
        ),
      );
};

const getOwnerId = (userId: string): string =>
  userId.slice(userId.lastIndexOf("/") + 1);

const validateRemoteContent = async (
  thirdPartyData: NewMessage["content"]["third_party_data"],
  userId: string,
  repository: RCConfigurationRepository,
): Promise<Result<void, ForbiddenError | GenericError | NotFoundError>> => {
  if (!thirdPartyData) {
    return ok(undefined);
  }

  if (!thirdPartyData.configuration_id) {
    return err(new ForbiddenError());
  }

  const configurationResult = await repository.getRemoteContentConfiguration(
    thirdPartyData.configuration_id,
  );

  if (configurationResult.isErr()) {
    return configurationResult.error instanceof NotFoundError
      ? err(configurationResult.error)
      : err(
          new GenericError(
            "Cannot retrieve the remote content configuration. Service unreachable.",
          ),
        );
  }

  return getOwnerId(userId) === configurationResult.value.userId
    ? ok(undefined)
    : err(new ForbiddenError());
};

const validateAttachments = (
  message: NewMessage,
): Result<void, ForbiddenError> =>
  message.feature_level_type !== "ADVANCED" &&
  message.content.third_party_data?.has_attachments === true
    ? err(new ForbiddenError())
    : ok(undefined);

const validateRecipient = (
  fiscalCode: FiscalCode,
  permissions: ReadonlySet<CreateMessagePermission>,
  authorizedRecipients: readonly string[],
): Result<void, ForbiddenError> => {
  if (permissions.has("ApiLimitedMessageWrite")) {
    return authorizedRecipients.includes(fiscalCode)
      ? ok(undefined)
      : err(new ForbiddenError());
  }

  return permissions.has("ApiMessageWrite")
    ? ok(undefined)
    : err(new ForbiddenError());
};

const validatePayment = (
  message: NewMessage,
  maximumAmount: number,
): Result<void, ValidationError> => {
  const requestedAmount = message.content.payment_data?.amount;
  return requestedAmount !== undefined && requestedAmount > maximumAmount
    ? err(
        new ValidationError(
          `Error while sending payment metadata: The requested amount (${requestedAmount} cents) exceeds the maximum allowed for this service (${maximumAmount} cents)`,
        ),
      )
    : ok(undefined);
};

export const makeCreateMessageUseCase =
  (
    messageMetadataRepository: MessageMetadataRepository,
    servicesCmsRepository: ServicesCmsRepository,
    remoteContentConfigurationRepository: RCConfigurationRepository,
    processingMessagePayloadStore: ProcessingMessagePayloadStore,
    messageCreatedEventPublisher: MessageCreatedEventPublisher,
    logger: Logger,
    generateMessageId: MessageIdGenerator = ulid,
    clock: Clock = () => new Date(),
  ): CreateMessageUseCase =>
  async (input) => {
    const serviceResult = await getService(
      input.subscriptionId,
      servicesCmsRepository,
    );
    if (serviceResult.isErr()) {
      return err(serviceResult.error);
    }
    const service = serviceResult.value;

    const payloadPermissionsResult = validatePayloadPermissions(
      input.message,
      input.permissions,
    );
    if (payloadPermissionsResult.isErr()) {
      return err(payloadPermissionsResult.error);
    }

    const clientIpResult = validateClientIp(
      input.clientIp,
      service.authorized_cidrs,
    );
    if (clientIpResult.isErr()) {
      return err(clientIpResult.error);
    }

    const fiscalCodeResult = getFiscalCode(
      input.fiscalCode,
      input.message.fiscal_code,
    );
    if (fiscalCodeResult.isErr()) {
      return err(fiscalCodeResult.error);
    }
    const fiscalCode = fiscalCodeResult.value;

    const remoteContentResult = await validateRemoteContent(
      input.message.content.third_party_data,
      input.userId,
      remoteContentConfigurationRepository,
    );
    if (remoteContentResult.isErr()) {
      return err(remoteContentResult.error);
    }

    const attachmentsResult = validateAttachments(input.message);
    if (attachmentsResult.isErr()) {
      return err(attachmentsResult.error);
    }

    const messageId = generateMessageId();

    const recipientResult = validateRecipient(
      fiscalCode,
      input.permissions,
      service.authorized_recipients,
    );
    if (recipientResult.isErr()) {
      return err(recipientResult.error);
    }

    const paymentResult = validatePayment(
      input.message,
      service.max_allowed_payment_amount,
    );
    if (paymentResult.isErr()) {
      return err(paymentResult.error);
    }

    const metadata: MessageMetadata = {
      createdAt: clock().toISOString(),
      featureLevelType: input.message.feature_level_type,
      fiscalCode,
      id: messageId,
      indexedId: messageId,
      isPending: true,
      senderServiceId: service.id,
      senderUserId: input.userId,
      timeToLiveSeconds: input.message.time_to_live,
    };

    const metadataResult =
      await messageMetadataRepository.createMessageMetadata(metadata);
    if (metadataResult.isErr()) {
      return err(metadataResult.error);
    }

    const processingPayloadResult =
      await processingMessagePayloadStore.savePayload({
        content: input.message.content,
        message: {
          ...metadata,
          fiscalCode,
        },
        senderMetadata: {
          organizationFiscalCode: service.organization.fiscal_code,
          organizationName: service.organization.name,
          requireSecureChannels:
            input.message.content.require_secure_channels ??
            service.require_secure_channel,
          serviceCategory: service.metadata.category ?? "STANDARD",
          serviceName: service.name,
          serviceUserEmail: input.userEmail,
        },
      });

    if (processingPayloadResult.isErr()) {
      logger.trackEvent({
        name: "CreateMessageUseCase.saveProcessingMessage.failed",
        properties: {
          errorMessage: processingPayloadResult.error.message,
          messageId,
          serviceId: service.id,
        },
      });
      return err(new GenericError("Unable to store processing message"));
    }

    const publishResult = await messageCreatedEventPublisher.publish({
      defaultAddresses: {},
      messageId,
    });
    if (publishResult.isErr()) {
      logger.trackEvent({
        name: "CreateMessageUseCase.publishCreatedMessage.failed",
        properties: {
          errorMessage: publishResult.error.message,
          messageId,
          serviceId: service.id,
        },
      });
      return err(publishResult.error);
    }

    return ok({ id: messageId });
  };
