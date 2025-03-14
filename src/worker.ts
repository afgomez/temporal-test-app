import { Worker } from "@temporalio/worker";
import { QUEUE_NAME } from "./shared/consts.js";

import { createRequire } from "node:module";
import * as activities from "./activities/activities.js";

// TIL!
const require = createRequire(import.meta.url);

async function run() {
  const worker = await Worker.create({
    taskQueue: QUEUE_NAME,
    workflowsPath: require.resolve("./workflows/workflows.js"),
    activities,
  });

  await worker.run();
}

try {
  await run();
} catch (e) {
  console.error(e);
  process.exit(1);
}
