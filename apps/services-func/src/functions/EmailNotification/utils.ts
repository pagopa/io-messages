import { apply } from "@pagopa/io-app-email-templates/MessagePreview/index";
import { CreatedMessageEventSenderMetadata } from "@pagopa/io-functions-commons/dist/src/models/created_message_sender_metadata";
import { markdownToHtml } from "@pagopa/io-functions-commons/dist/src/utils/markdown";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import * as S from "fp-ts/string";

import { MessageContent } from "../../generated/definitions/MessageContent";

// eslint-disable-next-line
const removeMd = require("remove-markdown");

const MAX_CHARACTER_FOR_BODY_MAIL = 134;

type Processor = (
  input: string,
) => Promise<{ readonly toString: () => string }>;

export const contentToHtml: (
  processor?: Processor,
) => (markdown: string) => TE.TaskEither<Error, string> = (
  processor = markdownToHtml.process,
) =>
  flow(
    TE.tryCatchK((m) => processor(m), E.toError),
    TE.map((htmlAsFile) => htmlAsFile.toString()),
    TE.map(S.replace(/\n|\r\n/g, "</p><p>")),
  );

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MessageReducedToHtmlInput = {
  readonly content: MessageContent;
  readonly senderMetadata: CreatedMessageEventSenderMetadata;
};

export const truncateMarkdown = (plainText: string): string =>
  // we add "..." only when the message is going to be truncate
  plainText.length > MAX_CHARACTER_FOR_BODY_MAIL
    ? plainText.substring(0, MAX_CHARACTER_FOR_BODY_MAIL) + "..."
    : plainText.substring(0, MAX_CHARACTER_FOR_BODY_MAIL);

export const removeLinks = (text: string): string =>
  text.replace(/\w*:\/\/[^\s]*\.[\w?/=&%-+#]*/g, "[link rimosso]");

/**
 * Add a zero-width space before every '.' character in order to makke all the links not clickable
 * */

export const invalidateClickableLinks = (text: string): string =>
  text.replace(/\./g, ".\u{200B}");

export const prepareBody = (markdown: string): string =>
  pipe(
    markdown.split("---").pop(),
    removeMd,
    truncateMarkdown,
    removeLinks,
    invalidateClickableLinks,
  );

type MessageReducedToHtmlOutput = ({
  content,
  senderMetadata,
}: MessageReducedToHtmlInput) => TE.TaskEither<Error, string>;

export const messageReducedToHtml =
  (processor?: Processor): MessageReducedToHtmlOutput =>
  ({ content, senderMetadata }): TE.TaskEither<Error, string> =>
    pipe(
      content.markdown,
      prepareBody,
      contentToHtml(processor),
      // strip leading zeroes
      TE.map((bodyHtml) =>
        apply(bodyHtml, content.subject, {
          organizationName: senderMetadata.organizationName,
          serviceName: senderMetadata.serviceName,
        }),
      ),
    );
