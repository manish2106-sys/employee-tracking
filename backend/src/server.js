import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { createAdminToken, requireAdminAuth, verifyPassword } from "./auth.js";
import {
  checkIn,
  checkOut,
  createEmployee,
  deleteEmployee,
  ensureSeedAdmin,
  getAdminByUsername,
  getSummary,
  listAttendanceSessions,
  listEmployees,
  updateEmployee
} from "./storage.js";

ensureSeedAdmin();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "employee-tracker-backend",
    now: new Date().toISOString()
  });
});

app.post("/api/admin/login", (req, res) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const admin = getAdminByUsername(username);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = createAdminToken(admin);
  return res.json({
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      name: admin.name
    }
  });
});

app.post("/api/attendance/check-in", (req, res) => {
  try {
    const result = checkIn(req.body ?? {});
    return res.status(201).json({ message: "Check-in recorded.", session: result });
  } catch (error) {
    return res.status(400).json({ message: error.message ?? "Unable to check in." });
  }
});

app.post("/api/attendance/check-out", (req, res) => {
  try {
    const result = checkOut(req.body ?? {});
    return res.status(200).json({ message: "Check-out recorded.", session: result });
  } catch (error) {
    return res.status(400).json({ message: error.message ?? "Unable to check out." });
  }
});

app.use("/api/admin", requireAdminAuth);

app.get("/api/admin/summary", (_req, res) => {
  return res.json(getSummary());
});

app.get("/api/admin/employees", (_req, res) => {
  return res.json({ employees: listEmployees() });
});

app.post("/api/admin/employees", (req, res) => {
  try {
    const employee = createEmployee(req.body ?? {});
    return res.status(201).json({ message: "Employee created.", employee });
  } catch (error) {
    return res.status(400).json({ message: error.message ?? "Unable to create employee." });
  }
});

app.put("/api/admin/employees/:id", (req, res) => {
  try {
    const employee = updateEmployee(req.params.id, req.body ?? {});
    return res.status(200).json({ message: "Employee updated.", employee });
  } catch (error) {
    return res.status(400).json({ message: error.message ?? "Unable to update employee." });
  }
});

app.delete("/api/admin/employees/:id", (req, res) => {
  try {
    deleteEmployee(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ message: error.message ?? "Unable to delete employee." });
  }
});

app.get("/api/admin/attendance", (req, res) => {
  const sessions = listAttendanceSessions({
    employeeId: req.query.employeeId,
    from: req.query.from,
    to: req.query.to
  });

  return res.json({ sessions });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  return res.status(500).json({ message: "Internal server error." });
});

app.listen(config.port, () => {
  console.log(`Employee Tracker backend running on http://localhost:${config.port}`);
});
