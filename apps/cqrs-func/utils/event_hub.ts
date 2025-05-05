import { AzureEventhubSas, AzureEventhubSasFromString, KafkaProducerCompact, fromConfig } from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import { MessageFormatter } from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaTypes";
import { pipe } from "fp-ts/lib/function";

export const fromSas = <T>(
  sas: AzureEventhubSas,
  ssl: boolean,
  messageFormatter?: MessageFormatter<T>
): KafkaProducerCompact<T> =>
  pipe(
    {
      brokers: [`${sas.url}:9093`],
      ssl: ssl,
      sasl: {
        mechanism: "plain" as const,
        username: "$ConnectionString",
        password: AzureEventhubSasFromString.encode(sas)
      },
      clientId: sas.policy,
      idempotent: true,
      transactionalId: sas.policy,
      maxInFlightRequests: 1,
      messageFormatter,
      topic: sas.name
    },
    fullConfig => fromConfig(fullConfig, fullConfig)
  );
