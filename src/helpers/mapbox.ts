import createNodeClient from "@mapbox/mapbox-sdk";
import MapiClient from "@mapbox/mapbox-sdk/lib/classes/mapi-client";
import { getConfig } from "./config.js";
import { InvalidTokenError } from "./errors.js";

const config = getConfig();

let client: MapiClient;

export function getMapboxClient(): MapiClient {
  try {
    client ??= createNodeClient({ accessToken: config.MAPBOX_ACCESS_TOKEN });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Invalid token")) {
      throw new InvalidTokenError("Invalid MAPBOX_ACCESS_TOKEN");
    }

    // TODO: could other errors also be retried?
    // If not, create a generic `NonRetriableError` class and use that for everything
    throw err;
  }

  return client;
}
