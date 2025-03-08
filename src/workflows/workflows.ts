type CheckRouteArgs = {
  waypoints: string[];
};

export async function checkRoute(_args: CheckRouteArgs): Promise<void> {
  // 1. Resolve waypoints into coordinates
  // 2. Create a route with the coordinates
  // 3. Test for traffic delays
  // 4. If the delay is longer than 10 minutes, notify the customer
}
