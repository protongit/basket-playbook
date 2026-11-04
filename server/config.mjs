import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const production = process.env.NODE_ENV === "production";

export const config = {
  root,
  publicDir: path.join(root, "public"),
  dataDir: path.dirname(process.env.DB_PATH || path.join(root, "data", "basket-playbook.db")),
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || "0.0.0.0",
  dbPath: process.env.DB_PATH || path.join(root, "data", "basket-playbook.db"),
  sessionSecret:
    process.env.SESSION_SECRET ||
    (production ? null : "dev-only-secret-change-me-in-production"),
  secureCookies:
    process.env.COOKIE_SECURE === "1" ||
    (production && process.env.COOKIE_SECURE !== "0"),
  registrationMode: process.env.REGISTRATION_MODE || "open",
  inviteCode: process.env.INVITE_CODE || "",
  nanApiKey: process.env.NAN_API_KEY || "",
  nanBaseUrl: (process.env.NAN_BASE_URL || "https://api.nan.builders/v1").replace(/\/$/, ""),
  nanModel: process.env.NAN_MODEL || "deepseek-v4-flash",
  sessionDays: 30,
  version: "1.0.0",
};

if (!config.sessionSecret) {
  console.error(
    "Falta SESSION_SECRET. Genera uno con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  );
  process.exit(1);
}
