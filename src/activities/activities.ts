import { log } from "@temporalio/activity";
import GeocodingV6 from "@mapbox/mapbox-sdk/services/geocoding-v6";
import Directions, { Route } from "@mapbox/mapbox-sdk/services/directions";
import { getMapboxClient } from "../helpers/mapbox.js";

class GeocodeLocationError extends Error {}
class DirectionsError extends Error {}

type Coordinates = [number, number];

export async function geocodeLocation(location: string): Promise<Coordinates> {
  const geocodingService = GeocodingV6(getMapboxClient());

  log.debug(`Resolving coordinates for location '${location}'`);
  const mbxResponse = await geocodingService
    .forwardGeocode({ query: location })
    .send();

  const features = mbxResponse.body.features;

  if (features.length === 0) {
    throw new GeocodeLocationError(
      `Unable to find coordinates for location '${location}'`
    );
  }

  // Usually Mapbox returns more than 1 result. We assume the
  // first one is the correct one.
  const coordinates = features[0].geometry.coordinates;
  log.debug(`Location '${location}' -> [${coordinates.join(", ")}]`);
  return coordinates;
}

export async function getNavigationRoute(coordinatesList: Coordinates[]) {
  const directionsService = Directions(getMapboxClient());
  const mbxResponse = await directionsService
    .getDirections({
      profile: "driving-traffic",
      waypoints: coordinatesList.map((coordinates) => ({ coordinates })),
      alternatives: false, // We trust you, Mapbox
    })
    .send();

  const routes = mbxResponse.body.routes;
  if (routes.length == 0) {
    throw new DirectionsError(
      `Unable to create a route for coordinates list: ${JSON.stringify(
        coordinatesList
      )}`
    );
  }
  log.info(JSON.stringify(routes[0]));

  // @types/mapbox__mapbox-sdk are incorrect here
  return routes[0] as Route<string> & { duration_typical: number };
}
