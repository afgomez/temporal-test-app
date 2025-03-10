import { ApplicationFailure, log } from "@temporalio/activity";
import GeocodingV6 from "@mapbox/mapbox-sdk/services/geocoding-v6";
import Directions, { Route } from "@mapbox/mapbox-sdk/services/directions";
import { getMapboxClient, handleMapboxError } from "../helpers/mapbox.js";
import { getResendClient } from "../helpers/resend.js";
import { getConfig } from "../helpers/config.js";
import { ErrorResponse } from "resend";
import {
  DEVELOPER_PROMPTS,
  getOpenAIClient,
  handleOpenAIError,
  parsePromptTemplate,
} from "../helpers/openai.js";
import { isHTTPClientError } from "../helpers/errors.js";

type Coordinates = [number, number];

export async function geocodeLocation(location: string): Promise<Coordinates> {
  const geocodingService = GeocodingV6(getMapboxClient());
  let response;

  try {
    response = await geocodingService
      .forwardGeocode({ query: location })
      .send();
  } catch (err) {
    handleMapboxError(err);
  }

  const features = response.body.features;

  log.debug(`GeocodingV6 response: ${JSON.stringify(response.body)}`);
  if (features.length === 0) {
    throw ApplicationFailure.create({
      message: `Unable to find coordinates for location '${location}'`,
      type: "mapbox-empty-geocoding",
      nonRetryable: true,
    });
  }

  // Usually Mapbox returns more than 1 result. We assume the
  // first one is the correct one.
  const coordinates = features[0].geometry.coordinates;
  log.info(
    `Resolved coordinates for '${location}' -> [${coordinates.join(", ")}]`
  );

  return coordinates;
}

export async function getNavigationRoute(coordinatesList: Coordinates[]) {
  const directionsService = Directions(getMapboxClient());
  let response;
  try {
    response = await directionsService
      .getDirections({
        profile: "driving-traffic",
        waypoints: coordinatesList.map((coordinates) => ({ coordinates })),
        alternatives: false, // We trust you, Mapbox
      })
      .send();
  } catch (err) {
    handleMapboxError(err);
  }

  log.debug(`Directions response: ${JSON.stringify(response.body)}`);
  const routes = response.body.routes;
  if (routes.length == 0) {
    throw ApplicationFailure.create({
      message: `Unable to create a route for coordinates list: ${JSON.stringify(
        coordinatesList
      )}`,
      type: "mapbox-empty-directions",
      nonRetryable: true,
    });
  }

  // @types/mapbox__mapbox-sdk are incorrect here
  const route = routes[0] as Route<string> & { duration_typical: number };
  log.info(
    `Found route { duration: ${route.duration}, duration_typical: ${
      route.duration_typical
    } }. Delay: ${Math.floor(route.duration - route.duration_typical)} seconds`
  );

  return route;
}

export async function createAIEmail(
  locations: string[],
  delay: number
): Promise<string> {
  const values: Record<string, string> = {
    customer: "John Doe",
    from: locations[0],
    to: locations.slice(-1)[0],
    delay: delay.toString(),
  };

  const parsedPrompt = parsePromptTemplate("TRAFFIC_DELAY_MESSAGE", values);

  const openai = getOpenAIClient();
  let response;
  try {
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "developer",
          content: [
            { type: "text", text: DEVELOPER_PROMPTS.CUSTOMER_SUPPORT_MESSAGE },
          ],
        },
        {
          role: "user",
          content: [{ type: "text", text: parsedPrompt }],
        },
      ],
    });
  } catch (err) {
    handleOpenAIError(err);
  }

  log.debug("OpenAI response: ${JSON.Stringify(response)}");

  const content = response.choices?.[0].message.content;
  if (!content) {
    throw ApplicationFailure.create({
      message: "OpenAI: could not get a chat response",
      type: "openai-empty-response",
    });
  }

  log.info(`Generated AI message: ${content}`);
  return content;
}

export async function createSimpleEmail(locations: string[], delay: number) {
  const content = `<p>Your delivery between ${locations[0]} and ${
    locations.slice(-1)[0]
  } is delayed by about ${Math.floor(
    delay / 60
  )} minutes. Sorry about that!</p><p>Kind regards,<br/>Friendly Freighters</p>`;

  log.info(`Generated simple message: ${content}`);
  return content;
}

export async function notifyCustomer(htmlMessage: string) {
  const resend = getResendClient();

  const response = await resend.emails.send({
    from: "Freight Notifier <test@resend.dev>",
    to: getConfig().CUSTOMER_EMAIL,
    subject: "Delay in route",
    html: htmlMessage,
  });

  log.debug(`resend response: ${JSON.stringify(response)}`);

  // https://github.com/resend/resend-node/issues/286
  const error = response.error as ErrorResponse & { statusCode: number };
  if (error) {
    throw ApplicationFailure.fromError(error, {
      type: "resend-error",
      nonRetryable: isHTTPClientError(error.statusCode),
    });
  } else {
    log.info(`Resend: sent email #${response.data?.id}`);
  }

  return response.data;
}
