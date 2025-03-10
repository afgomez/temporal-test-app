import { TestWorkflowEnvironment } from "@temporalio/testing";
import { type NativeConnection, Worker } from "@temporalio/worker";

import type * as activities from "../../activities/activities.js";
import { checkRoute } from "../../workflows/workflows.js";
import { describe, it, before, after, mock, afterEach } from "node:test";
import assert from "node:assert";
import { createRequire } from "node:module";
import { WorkflowFailedError } from "@temporalio/client";

const require = createRequire(import.meta.url);

await describe("checkRoute", () => {
  let testEnv: TestWorkflowEnvironment;
  const taskQueue = "test";

  const mockActivities = {
    geocodeLocation: mock.fn(() => Promise.resolve([0, 0] as [number, number])),
    getNavigationRoute: mock.fn(() =>
      Promise.resolve({ duration: 0, duration_typical: 0 } as any)
    ),
    generateResponse: mock.fn(() =>
      Promise.resolve("We are late. Sorry about that")
    ),
    notifyCustomer: mock.fn(() => Promise.resolve(null)),
  };

  async function makeWorker(connection: NativeConnection) {
    return await Worker.create({
      connection,
      taskQueue,
      workflowsPath: require.resolve("../../workflows/workflows.js"),
      activities: mockActivities,
    });
  }

  before(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  after(async () => {
    await testEnv?.teardown();
  });

  afterEach(() => {
    Object.values(mockActivities).forEach((fn) => fn.mock.resetCalls());
  });

  it("Fails with no locations", async () => {
    const { client, nativeConnection } = testEnv;

    const worker = await makeWorker(nativeConnection);
    await assert.rejects(async () => {
      await worker.runUntil(async () => {
        await client.workflow.execute(checkRoute, {
          args: [{ locations: [] }],
          workflowId: "test",
          taskQueue,
        });
      });
    }, WorkflowFailedError);
  });

  it("Fails with one location", async () => {
    const { client, nativeConnection } = testEnv;

    const worker = await makeWorker(nativeConnection);
    await assert.rejects(async () => {
      await worker.runUntil(async () => {
        await client.workflow.execute(checkRoute, {
          args: [{ locations: [] }],
          workflowId: "test",
          taskQueue,
        });
      });
    }, WorkflowFailedError);
  });

  it("Returns `on_time` if the delay is less than 10 minutes", async () => {
    mockActivities.getNavigationRoute.mock.mockImplementationOnce(() =>
      Promise.resolve({ duration: 10 * 60 - 1, duration_typical: 0 })
    );

    const { client, nativeConnection } = testEnv;

    const worker = await makeWorker(nativeConnection);
    await worker.runUntil(async () => {
      const result = await client.workflow.execute(checkRoute, {
        args: [{ locations: ["one", "two"] }],
        workflowId: "test",
        taskQueue,
      });

      assert.equal(result, "on_time");
      assert.equal(mockActivities.generateResponse.mock.callCount(), 0);
      assert.equal(mockActivities.notifyCustomer.mock.callCount(), 0);
    });
  });

  it("Returns `delayed` if the delay is 10 minutes or more", async () => {
    mockActivities.getNavigationRoute.mock.mockImplementationOnce(() =>
      Promise.resolve({ duration: 10 * 60 + 1, duration_typical: 0 })
    );

    const { client, nativeConnection } = testEnv;

    const worker = await makeWorker(nativeConnection);
    await worker.runUntil(async () => {
      const result = await client.workflow.execute(checkRoute, {
        args: [{ locations: ["one", "two"] }],
        workflowId: "test",
        taskQueue,
      });

      assert.equal(result, "delayed");
      assert.equal(mockActivities.generateResponse.mock.callCount(), 1);
      assert.equal(mockActivities.notifyCustomer.mock.callCount(), 1);
    });
  });
});
