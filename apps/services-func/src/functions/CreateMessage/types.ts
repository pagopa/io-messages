import {
  FeatureLevelType,
  FeatureLevelTypeEnum,
} from "@pagopa/io-functions-commons/dist/generated/definitions/v2/FeatureLevelType";
import { NewMessage as ApiNewMessage } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/NewMessage";
import { TimeToLiveSeconds } from "@pagopa/io-functions-commons/dist/generated/definitions/v2/TimeToLiveSeconds";
import * as t from "io-ts";
import * as E from "fp-ts/lib/Either";

import { ThirdPartyData } from "../../generated/definitions/ThirdPartyData";
import { pipe } from "fp-ts/lib/function";

export type ApiNewMessageWithDefaults = t.TypeOf<
  typeof ApiNewMessageWithDefaults
>;

export const ApiNewMessageWithDefaults = t.intersection([
  new t.Type<
    // NOTE:Here we omit the property because it is provided in the
    // `ApiNewMessage` imported from `@pagopa/io-functions-commons`, once we
    // rewrite those decoders using zod there will be no need to do so.
    //
    // This omit is needed in order to strip away the `eu_covid_cert` property
    // as we would do with any other property don't provided in the decoder.
    Omit<t.TypeOf<typeof ApiNewMessage>, "eu_covid_cert">,
    t.OutputOf<typeof ApiNewMessage>,
    t.InputOf<typeof ApiNewMessage>
  >(
    "ApiNewMessage",
    (u): u is Omit<t.TypeOf<typeof ApiNewMessage>, "eu_covid_cert"> =>
      ApiNewMessage.is(u),
    (u, c) => pipe(ApiNewMessage.validate(u, c)),
    (a) => ApiNewMessage.encode(a as t.TypeOf<typeof ApiNewMessage>),
  ),
  t.type({
    feature_level_type: FeatureLevelType,
    time_to_live: TimeToLiveSeconds,
  }),
]);

type PartialMessageContent = Partial<(typeof ApiNewMessage._A)["content"]>;

/**
 * Codec that matches a Message with a specific content pattern
 *
 * @param contentPattern a coded that matches a content pattern
 * @returns a codec that specialize ApiNewMessage
 */
export type ApiNewMessageWithContentOf<T extends PartialMessageContent> = {
  readonly content: T;
} & ApiNewMessage;
export const ApiNewMessageWithContentOf = <T extends PartialMessageContent>(
  contentPattern: t.Type<T, Partial<(typeof ApiNewMessage._O)["content"]>>,
): t.Type<{ readonly content: T } & ApiNewMessage, typeof ApiNewMessage._O> =>
  t.intersection([
    ApiNewMessage,
    t.type({
      content: contentPattern,
    }),
  ]);

export type ApiNewMessageWithAdvancedFeatures = t.TypeOf<
  typeof ApiNewMessageWithAdvancedFeatures
>;
export const ApiNewMessageWithAdvancedFeatures = t.intersection([
  t.union([
    ApiNewMessageWithContentOf(t.type({ third_party_data: ThirdPartyData })),
    ApiNewMessage,
  ]),
  t.type({
    feature_level_type: t.literal(FeatureLevelTypeEnum.ADVANCED),
  }),
]);

export const ApiNewThirdPartyMessage = t.intersection([
  ApiNewMessageWithContentOf(t.type({ third_party_data: ThirdPartyData })),
  t.partial({
    feature_level_type: t.literal(FeatureLevelTypeEnum.STANDARD),
  }),
]);

export type ApiNewThirdPartyMessage = t.TypeOf<typeof ApiNewThirdPartyMessage>;
