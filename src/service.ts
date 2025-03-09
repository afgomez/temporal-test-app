import { Client } from "@temporalio/client";
import { checkRoute } from "./workflows/workflows.js";
import { QUEUE_NAME } from "./shared/consts.js";

async function run(locations: string[]) {
  const client = new Client({});

  const handle = await client.workflow.start(checkRoute, {
    workflowId: "route-notifier",
    taskQueue: QUEUE_NAME,
    args: [{ locations }],
  });

  return await handle.result();
}

try {
  const locations = process.argv.slice(2);

  if (locations.length < 2) {
    throw new Error(
      "Unable to start the service: I need at least two locations."
    );
  }

  if (locations.length > 25) {
    throw new Error(
      "Unable to start the service: I (well... Mapbox) cannot handle more than 25 locations."
    );
  }

  await run(locations);
} catch (e) {
  console.error(e);
  process.exit(1);
}
