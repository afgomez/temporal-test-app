import createNodeClient from "@mapbox/mapbox-sdk";
import MapiClient from "@mapbox/mapbox-sdk/lib/classes/mapi-client";
import { getConfig } from "./config.js";
import { ApplicationFailure } from "@temporalio/common";
import { MapiError } from "@mapbox/mapbox-sdk/lib/classes/mapi-error";
import { isHTTPClientError } from "./errors.js";

const config = getConfig();

let client: MapiClient;

export function getMapboxClient(): MapiClient {
  client ??= createNodeClient({ accessToken: config.MAPBOX_ACCESS_TOKEN });
  return client;
}

export function handleMapboxError(err: unknown): never {
  // Mapbox errors don't seem to inherit from Error
  // If the error is a regular JS error Error, forward it as is.
  if (err instanceof Error) {
    throw ApplicationFailure.fromError(err);
  }

  // Report Mapbox errors
  const mapiError = err as MapiError;
  const nonRetryable = isHTTPClientError(mapiError.statusCode || 0);
  throw ApplicationFailure.create({
    message: mapiError.message,
    type: mapiError.type,
    nonRetryable,
  });
}
