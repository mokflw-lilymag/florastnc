import { defineConfig } from "@trigger.dev/sdk/v3";

/** Floxync marketing — cloud.trigger.dev/projects/v3/proj_mhhvmrfusfwjvzavyswp */
export default defineConfig({
  project: "proj_mhhvmrfusfwjvzavyswp",
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
  dirs: ["./src/trigger"],
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
