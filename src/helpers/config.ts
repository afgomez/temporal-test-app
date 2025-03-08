import { z } from "zod";

const configSchema = z.object({
  CUSTOMER_EMAIL: z.string().email(),
});

let config: z.infer<typeof configSchema>;

export function getConfig() {
  config ??= configSchema.parse(process.env);
  return config;
}
