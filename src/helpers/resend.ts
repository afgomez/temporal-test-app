import { Resend } from "resend";
import { getConfig } from "./config.js";

let resendClient: Resend;

export function getResendClient(): Resend {
  resendClient ??= new Resend(getConfig().RESEND_API_KEY);
  return resendClient;
}
