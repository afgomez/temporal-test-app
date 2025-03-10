import { ApplicationFailure, proxyActivities } from "@temporalio/workflow";

import type * as activities from "../activities/activities.js";

type CheckRouteArgs = {
  locations: string[];
};

const {
  geocodeLocation,
  getNavigationRoute,
  createAIEmail,
  createSimpleEmail,
  notifyCustomer,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
  retry: {
    maximumAttempts: 5,
  },
});

const TEN_MINUTES = 10 * 60;

export type CheckRouteWorkflowResult = {
  notificationStatus: "skipped" | "sent" | "failed";
  delay: number;
  message?: string;
};

export async function checkRoute(
  args: CheckRouteArgs
): Promise<CheckRouteWorkflowResult> {
  if (args.locations.length < 2) {
    throw ApplicationFailure.nonRetryable(
      `checkRoute(): unable to run workflow. Expected 2+ locations. Got ${args.locations.length}`
    );
  }

  // TODO: optimization: Mapbox has a batch mode for its geocode API. Use that
  // instead of making a request per location.
  const coordinates = await Promise.all(args.locations.map(geocodeLocation));

  const route = await getNavigationRoute(coordinates);
  const durationDiff = route.duration - route.duration_typical;

  // if (true) {
  if (durationDiff >= TEN_MINUTES) {
    let response;
    try {
      response = await createAIEmail(args.locations, durationDiff);
    } catch {
      response = await createSimpleEmail(args.locations, durationDiff);
    }

    let notificationStatus;
    try {
      await notifyCustomer(response);
      notificationStatus = "sent" as const;
    } catch {
      notificationStatus = "failed" as const;
    }
    return { delay: durationDiff, notificationStatus, message: response };
  } else {
    return { delay: durationDiff, notificationStatus: "skipped" };
  }
}
