import { Worker } from "@temporalio/worker";
import { QUEUE_NAME } from "./shared/consts.js";

async function run() {
  const worker = await Worker.create({
    taskQueue: QUEUE_NAME,
  });

  await worker.run();
}

try {
  await run();
} catch (e) {
  console.error(e);
  process.exit(1);
}
