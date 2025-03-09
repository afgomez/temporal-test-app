import { proxyActivities } from "@temporalio/workflow";

import type * as activities from "../activities/activities.js";

type CheckRouteArgs = {
  locations: string[];
};

const { geocodeLocation } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
  retry: {
    nonRetryableErrorTypes: ["GeocodeLocationError"],
  },
});

export async function checkRoute(
  args: CheckRouteArgs
): Promise<"on_time" | "delayed"> {
  const _coordinates = await Promise.all(args.locations.map(geocodeLocation));

  // 2. Create a route with the coordinates
  // 3. Test for traffic delays
  // 4. If the delay is longer than 10 minutes, notify the customer

  return "on_time";
}
