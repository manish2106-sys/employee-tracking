import dotenv from "dotenv";

dotenv.config();

function getEnvValue(key, fallback) {
  const value = process.env[key];
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function parseCorsOrigins(rawValue) {
  const raw = String(rawValue ?? "*").trim();
  if (!raw || raw === "*") {
    return ["*"];
  }

  const normalized = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (item === "*") {
        return "*";
      }

      const withScheme = /^https?:\/\//i.test(item) ? item : `https://${item}`;
      return withScheme.replace(/\/$/, "");
    });

  if (normalized.includes("*")) {
    return ["*"];
  }

  return [...new Set(normalized)];
}

export const config = {
  port: Number.parseInt(getEnvValue("PORT", "4000"), 10),
  jwtSecret: getEnvValue("JWT_SECRET", "dev-secret-change-me"),
  adminUsername: getEnvValue("ADMIN_USERNAME", "admin"),
  adminPassword: getEnvValue("ADMIN_PASSWORD", "Admin@123"),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS)
};
