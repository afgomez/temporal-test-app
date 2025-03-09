import { log } from "@temporalio/activity";
import { getConfig } from "../helpers/config.js";
import GeocodingV6 from "@mapbox/mapbox-sdk/services/geocoding-v6";

const config = getConfig();

class GeocodeLocationError extends Error {}

export async function geocodeLocation(
  location: string
): Promise<[number, number]> {
  const geocodingService = GeocodingV6({
    accessToken: config.MAPBOX_ACCESS_TOKEN,
  });

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
