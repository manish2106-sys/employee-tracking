import dotenv from "dotenv";

dotenv.config();

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
  port: Number.parseInt(process.env.PORT ?? "4000", 10),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "Admin@123",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS)
};
