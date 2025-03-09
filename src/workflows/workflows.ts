import { proxyActivities } from "@temporalio/workflow";

import type * as activities from "../activities/activities.js";

type CheckRouteArgs = {
  locations: string[];
};

const { geocodeLocation, getNavigationRoute } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "1 minute",
  retry: {
    nonRetryableErrorTypes: [
      "InvalidTokenError",
      "DirectionsError",
      "InvalidTokenError",
    ],
  },
});

const TEN_MINUTES = 10 * 60 * 1000;

export async function checkRoute(
  args: CheckRouteArgs
): Promise<"on_time" | "delayed"> {
  // TODO: optimization: Mapbox has a batch mode for its geocode API. Use that
  // instead of making a request per location.
  const coordinates = await Promise.all(args.locations.map(geocodeLocation));

  const route = await getNavigationRoute(coordinates);

  const durationDiff = route.duration - route.duration_typical;

  // if (true) {
  if (durationDiff > TEN_MINUTES) {
    // Generate fancy message
    // Send message

    return "delayed";
  } else {
    return "on_time";
  }
}
