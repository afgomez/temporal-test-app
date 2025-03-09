import { z } from "zod";

const configSchema = z.object({
  CUSTOMER_EMAIL: z.string().email(),
  MAPBOX_ACCESS_TOKEN: z.string(),
});

let config: z.infer<typeof configSchema>;

export function getConfig() {
  config ??= configSchema.parse(process.env);
  return config;
}
