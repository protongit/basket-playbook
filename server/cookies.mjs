import { config } from "./config.mjs";

export function cookieHeader(token) {
  const maxAge = config.sessionDays * 24 * 60 * 60;
  const parts = [
    `bp_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (config.secureCookies) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookieHeader() {
  const parts = ["bp_session=", "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (config.secureCookies) parts.push("Secure");
  return parts.join("; ");
}
