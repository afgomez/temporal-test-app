import { ApplicationFailure, log } from "@temporalio/activity";
import GeocodingV6 from "@mapbox/mapbox-sdk/services/geocoding-v6";
import Directions, { Route } from "@mapbox/mapbox-sdk/services/directions";
import { getMapboxClient } from "../helpers/mapbox.js";
import { getResendClient } from "../helpers/resend.js";
import { getConfig } from "../helpers/config.js";
import { ErrorResponse } from "resend";

class GeocodeLocationError extends Error {}
class DirectionsError extends Error {}

type Coordinates = [number, number];

export async function geocodeLocation(location: string): Promise<Coordinates> {
  const geocodingService = GeocodingV6(getMapboxClient());

  const response = await geocodingService
    .forwardGeocode({ query: location })
    .send();

  const features = response.body.features;

  log.debug(`GeocodingV6 response: ${JSON.stringify(response.body)}`);
  if (features.length === 0) {
    throw new GeocodeLocationError(
      `Unable to find coordinates for location '${location}'`
    );
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
  const response = await directionsService
    .getDirections({
      profile: "driving-traffic",
      waypoints: coordinatesList.map((coordinates) => ({ coordinates })),
      alternatives: false, // We trust you, Mapbox
    })
    .send();

  log.debug(`Directions response: ${JSON.stringify(response.body)}`);
  const routes = response.body.routes;
  if (routes.length == 0) {
    throw new DirectionsError(
      `Unable to create a route for coordinates list: ${JSON.stringify(
        coordinatesList
      )}`
    );
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

export async function notifyCustomer(htmlMessage: string) {
  const resend = getResendClient();

  const response = await resend.emails.send({
    from: "Freight Notifier <test@resend.dev>",
    to: getConfig().CUSTOMER_EMAIL,
    subject: "Delay in route",
    html: htmlMessage,
  });

  // https://github.com/resend/resend-node/issues/286
  const error = response.error as ErrorResponse & { statusCode: number };
  if (error) {
    const nonRetryable = error.statusCode >= 400 && error.statusCode < 500;
    throw new ApplicationFailure(error.message, error.name, nonRetryable);
  }

  return response.data;
}
