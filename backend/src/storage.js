import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "./auth.js";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, "../data/db.json");

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeCoordinate(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureDbExists() {
  const dbDir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE_PATH)) {
    const initialDb = {
      admins: [],
      employees: [],
      attendanceSessions: []
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialDb, null, 2), "utf8");
  }
}

function readDb() {
  ensureDbExists();
  const raw = fs.readFileSync(DB_FILE_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.admins || !parsed.employees || !parsed.attendanceSessions) {
      throw new Error("Invalid db shape");
    }

    return parsed;
  } catch {
    const fallback = {
      admins: [],
      employees: [],
      attendanceSessions: []
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

function writeDb(nextDb) {
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(nextDb, null, 2), "utf8");
}

export function ensureSeedAdmin() {
  const db = readDb();
  const existingAdmin = db.admins.find((admin) => admin.username === config.adminUsername);
  if (existingAdmin) {
    return;
  }

  db.admins.push({
    id: uuidv4(),
    username: config.adminUsername,
    name: "System Admin",
    passwordHash: hashPassword(config.adminPassword),
    createdAt: new Date().toISOString()
  });

  writeDb(db);
}

export function getAdminByUsername(username) {
  const db = readDb();
  return db.admins.find((admin) => admin.username === username) ?? null;
}

export function listEmployees() {
  const db = readDb();
  return [...db.employees]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((employee) => ({ ...employee }));
}

export function createEmployee(payload) {
  const employeeCode = normalizeString(payload.employeeCode);
  const fullName = normalizeString(payload.fullName);
  const department = normalizeString(payload.department);

  if (!employeeCode || !fullName) {
    throw new Error("Employee code and full name are required.");
  }

  const db = readDb();
  const existingCode = db.employees.find(
    (employee) => employee.employeeCode.toLowerCase() === employeeCode.toLowerCase()
  );

  if (existingCode) {
    throw new Error("Employee code already exists.");
  }

  const now = new Date().toISOString();
  const employee = {
    id: uuidv4(),
    employeeCode,
    fullName,
    email: normalizeString(payload.email),
    phone: normalizeString(payload.phone),
    department,
    isActive: payload.isActive === false ? false : true,
    createdAt: now,
    updatedAt: now
  };

  db.employees.push(employee);
  writeDb(db);
  return employee;
}

export function updateEmployee(employeeId, payload) {
  const db = readDb();
  const target = db.employees.find((employee) => employee.id === employeeId);

  if (!target) {
    throw new Error("Employee not found.");
  }

  const nextCode =
    payload.employeeCode !== undefined ? normalizeString(payload.employeeCode) : target.employeeCode;
  const nextName = payload.fullName !== undefined ? normalizeString(payload.fullName) : target.fullName;

  if (!nextCode || !nextName) {
    throw new Error("Employee code and full name are required.");
  }

  const duplicateCode = db.employees.find(
    (employee) =>
      employee.id !== employeeId && employee.employeeCode.toLowerCase() === nextCode.toLowerCase()
  );

  if (duplicateCode) {
    throw new Error("Employee code already exists.");
  }

  target.employeeCode = nextCode;
  target.fullName = nextName;
  if (payload.email !== undefined) {
    target.email = normalizeString(payload.email);
  }
  if (payload.phone !== undefined) {
    target.phone = normalizeString(payload.phone);
  }
  if (payload.department !== undefined) {
    target.department = normalizeString(payload.department);
  }
  if (payload.isActive !== undefined) {
    target.isActive = Boolean(payload.isActive);
  }
  target.updatedAt = new Date().toISOString();

  writeDb(db);
  return { ...target };
}

export function deleteEmployee(employeeId) {
  const db = readDb();
  const employeeIndex = db.employees.findIndex((employee) => employee.id === employeeId);

  if (employeeIndex === -1) {
    throw new Error("Employee not found.");
  }

  db.employees.splice(employeeIndex, 1);
  writeDb(db);
}

export function findEmployeeByCode(employeeCode) {
  const code = normalizeString(employeeCode);
  if (!code) {
    return null;
  }

  const db = readDb();
  return db.employees.find((employee) => employee.employeeCode.toLowerCase() === code.toLowerCase()) ?? null;
}

function getOpenSession(db, employeeId) {
  return (
    db.attendanceSessions
      .filter((session) => session.employeeId === employeeId && !session.logoutTime)
      .sort((a, b) => b.loginTime.localeCompare(a.loginTime))[0] ?? null
  );
}

export function checkIn(payload) {
  const employee = findEmployeeByCode(payload.employeeCode);

  if (!employee) {
    throw new Error("Employee not found.");
  }
  if (!employee.isActive) {
    throw new Error("Employee is inactive.");
  }

  const db = readDb();
  const openSession = getOpenSession(db, employee.id);
  if (openSession) {
    throw new Error("This employee is already checked in.");
  }

  const latitude = normalizeCoordinate(payload.latitude);
  const longitude = normalizeCoordinate(payload.longitude);
  const now = new Date().toISOString();

  const session = {
    id: uuidv4(),
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.fullName,
    loginTime: now,
    logoutTime: null,
    loginLocation: {
      latitude,
      longitude
    },
    logoutLocation: null,
    loginDeviceName: normalizeString(payload.deviceName),
    logoutDeviceName: null,
    createdAt: now,
    updatedAt: now
  };

  db.attendanceSessions.push(session);
  writeDb(db);
  return { ...session };
}

export function checkOut(payload) {
  const employee = findEmployeeByCode(payload.employeeCode);

  if (!employee) {
    throw new Error("Employee not found.");
  }

  const db = readDb();
  const openSession = getOpenSession(db, employee.id);
  if (!openSession) {
    throw new Error("No active check-in session found for this employee.");
  }

  const latitude = normalizeCoordinate(payload.latitude);
  const longitude = normalizeCoordinate(payload.longitude);
  openSession.logoutTime = new Date().toISOString();
  openSession.logoutLocation = {
    latitude,
    longitude
  };
  openSession.logoutDeviceName = normalizeString(payload.deviceName);
  openSession.updatedAt = new Date().toISOString();

  writeDb(db);
  return { ...openSession };
}

export function listAttendanceSessions(filters = {}) {
  const db = readDb();
  const employeeId = normalizeString(filters.employeeId);
  const from = normalizeString(filters.from);
  const to = normalizeString(filters.to);

  return db.attendanceSessions
    .filter((session) => {
      if (employeeId && session.employeeId !== employeeId) {
        return false;
      }

      if (from && session.loginTime < from) {
        return false;
      }

      if (to && session.loginTime > to) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.loginTime.localeCompare(a.loginTime))
    .map((session) => ({ ...session }));
}

export function getSummary() {
  const db = readDb();
  const totalEmployees = db.employees.length;
  const activeEmployees = db.employees.filter((employee) => employee.isActive).length;
  const checkedInNow = db.attendanceSessions.filter((session) => !session.logoutTime).length;
  const totalSessions = db.attendanceSessions.length;

  return {
    totalEmployees,
    activeEmployees,
    checkedInNow,
    totalSessions
  };
}
