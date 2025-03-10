import OpenAI, { APIError } from "openai";
import { getConfig } from "./config.js";
import { isHTTPClientError } from "./errors.js";
import { ApplicationFailure } from "@temporalio/common";

let client: OpenAI;

export const DEVELOPER_PROMPTS = {
  CUSTOMER_SUPPORT_MESSAGE: `You are an API that generates friendly email messages on behalf of "Friendly Freighters".
Messages are friendly. Messages are not apologetic. Messages don't contain solutions. If a delay is specified, show it in a human readable format. 
Your response format is HTML. Strip the \`<html>\`, \`<head>\`, and \`<body>\` tags.`,
} as const;

export const USER_PROMPTS = {
  TRAFFIC_DELAY_MESSAGE: `Customer "{{customer}}" has a delivery between "{{from}}" and "{{to}}", delayed {{delay}} seconds due to traffic. Componse a response.`,
} as const;

export function getOpenAIClient() {
  client ??= new OpenAI({ apiKey: getConfig().OPENAI_API_KEY });
  return client;
}

export function parsePromptTemplate(
  prompt: keyof typeof USER_PROMPTS,
  data: Record<string, string>
): string {
  return USER_PROMPTS[prompt].replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => data[key]
  );
}

export function handleOpenAIError(err: unknown): never {
  const nonRetryable =
    err instanceof APIError &&
    isHTTPClientError((err.status as number | undefined) || 0);

  throw ApplicationFailure.fromError(err, {
    type: "openai-error",
    nonRetryable: nonRetryable,
  });
}
