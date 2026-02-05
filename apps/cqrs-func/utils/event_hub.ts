import {
  AzureEventhubSas,
  AzureEventhubSasFromString,
  KafkaProducerCompact,
  fromConfig,
} from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import { MessageFormatter } from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaTypes";
import { pipe } from "fp-ts/lib/function";

export const fromSas = <T>(
  sas: AzureEventhubSas,
  ssl: boolean,
  messageFormatter?: MessageFormatter<T>,
): KafkaProducerCompact<T> =>
  pipe(
    {
      brokers: [`${sas.url}:9093`],
      clientId: sas.policy,
      idempotent: true,
      maxInFlightRequests: 1,
      messageFormatter,
      sasl: {
        mechanism: "plain" as const,
        password: AzureEventhubSasFromString.encode(sas),
        username: "$ConnectionString",
      },
      ssl: ssl,
      topic: sas.name,
      transactionalId: sas.policy,
    },
    (fullConfig) => fromConfig(fullConfig, fullConfig),
  );
