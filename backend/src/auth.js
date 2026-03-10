import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

const HASH_SEPARATOR = ":";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}${HASH_SEPARATOR}${hash}`;
}

export function verifyPassword(password, encodedHash) {
  const [salt, originalHash] = String(encodedHash).split(HASH_SEPARATOR);
  if (!salt || !originalHash) {
    return false;
  }

  const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(originalHash, "hex");
  const b = Buffer.from(computedHash, "hex");

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

export function createAdminToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      role: "admin",
      username: admin.username,
      name: admin.name
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function verifyAdminToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid authorization header." });
  }

  try {
    const payload = verifyAdminToken(token);
    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}
