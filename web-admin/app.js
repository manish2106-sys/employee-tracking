const runtimeApiBaseUrl = String(window.RUNTIME_CONFIG?.API_BASE_URL ?? "").trim();
const defaultApiBaseUrl = (
  localStorage.getItem("apiBaseUrl") ||
  runtimeApiBaseUrl ||
  "http://localhost:4000/api"
).replace(/\/$/, "");

const state = {
  apiBaseUrl: defaultApiBaseUrl,
  token: localStorage.getItem("adminToken") ?? "",
  adminName: localStorage.getItem("adminName") ?? "",
  employees: [],
  attendanceFilters: {
    from: "",
    to: ""
  }
};

const refs = {
  loginSection: document.querySelector("#login-section"),
  dashboardSection: document.querySelector("#dashboard-section"),
  loginForm: document.querySelector("#login-form"),
  apiBaseUrlInput: document.querySelector("#api-base-url"),
  usernameInput: document.querySelector("#username"),
  passwordInput: document.querySelector("#password"),
  status: document.querySelector("#status"),
  signedInAdmin: document.querySelector("#signed-in-admin"),
  summaryTotalEmployees: document.querySelector("#summary-total-employees"),
  summaryActiveEmployees: document.querySelector("#summary-active-employees"),
  summaryCheckedIn: document.querySelector("#summary-checked-in"),
  summaryTotalSessions: document.querySelector("#summary-total-sessions"),
  employeeForm: document.querySelector("#employee-form"),
  employeeTableBody: document.querySelector("#employee-table tbody"),
  attendanceTableBody: document.querySelector("#attendance-table tbody"),
  attendanceFilterForm: document.querySelector("#attendance-filter"),
  clearFiltersButton: document.querySelector("#clear-filters"),
  refreshAllButton: document.querySelector("#refresh-all"),
  logoutButton: document.querySelector("#logout")
};

function showStatus(message, timeout = 2600) {
  refs.status.textContent = message;
  refs.status.classList.add("visible");
  window.setTimeout(() => {
    refs.status.classList.remove("visible");
  }, timeout);
}

function normalizeIsoOrEmpty(localDateTime) {
  if (!localDateTime) {
    return "";
  }

  const date = new Date(localDateTime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = payload?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function renderAuthState() {
  refs.apiBaseUrlInput.value = state.apiBaseUrl;

  if (!state.token) {
    refs.loginSection.classList.remove("hidden");
    refs.dashboardSection.classList.add("hidden");
    return;
  }

  refs.loginSection.classList.add("hidden");
  refs.dashboardSection.classList.remove("hidden");
  refs.signedInAdmin.textContent = `Signed in as ${state.adminName || "Admin"}`;
}

function renderEmployees() {
  refs.employeeTableBody.innerHTML = "";

  for (const employee of state.employees) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${employee.employeeCode}</td>
      <td>${employee.fullName}</td>
      <td>${employee.department || "-"}</td>
      <td>${employee.email || "-"}</td>
      <td>${employee.phone || "-"}</td>
      <td>${employee.isActive ? "Active" : "Inactive"}</td>
      <td>
        <div class="row-actions">
          <button class="secondary" data-action="toggle" data-id="${employee.id}">
            ${employee.isActive ? "Disable" : "Enable"}
          </button>
          <button class="ghost" data-action="edit" data-id="${employee.id}">Edit</button>
          <button class="danger" data-action="delete" data-id="${employee.id}">Delete</button>
        </div>
      </td>
    `;
    refs.employeeTableBody.appendChild(row);
  }

  if (!state.employees.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="7">No employees yet.</td>`;
    refs.employeeTableBody.appendChild(emptyRow);
  }
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return date.toLocaleString();
}

function formatLocation(location) {
  if (!location || location.latitude === null || location.longitude === null) {
    return "-";
  }

  const lat = Number(location.latitude).toFixed(6);
  const lon = Number(location.longitude).toFixed(6);
  return `${lat}, ${lon}`;
}

function renderAttendance(sessions) {
  refs.attendanceTableBody.innerHTML = "";

  for (const session of sessions) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${session.employeeName} (${session.employeeCode})</td>
      <td>${formatDate(session.loginTime)}</td>
      <td>${formatDate(session.logoutTime)}</td>
      <td>${formatLocation(session.loginLocation)}</td>
      <td>${formatLocation(session.logoutLocation)}</td>
      <td>${session.loginDeviceName || "-"}</td>
      <td>${session.logoutDeviceName || "-"}</td>
    `;
    refs.attendanceTableBody.appendChild(row);
  }

  if (!sessions.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="7">No attendance sessions found.</td>`;
    refs.attendanceTableBody.appendChild(emptyRow);
  }
}

async function loadSummary() {
  const summary = await apiFetch("/admin/summary");
  refs.summaryTotalEmployees.textContent = String(summary.totalEmployees ?? 0);
  refs.summaryActiveEmployees.textContent = String(summary.activeEmployees ?? 0);
  refs.summaryCheckedIn.textContent = String(summary.checkedInNow ?? 0);
  refs.summaryTotalSessions.textContent = String(summary.totalSessions ?? 0);
}

async function loadEmployees() {
  const payload = await apiFetch("/admin/employees");
  state.employees = payload.employees ?? [];
  renderEmployees();
}

async function loadAttendance() {
  const params = new URLSearchParams();
  if (state.attendanceFilters.from) {
    params.set("from", state.attendanceFilters.from);
  }
  if (state.attendanceFilters.to) {
    params.set("to", state.attendanceFilters.to);
  }

  const suffix = params.toString() ? `?${params}` : "";
  const payload = await apiFetch(`/admin/attendance${suffix}`);
  renderAttendance(payload.sessions ?? []);
}

async function refreshDashboardData() {
  await Promise.all([loadSummary(), loadEmployees(), loadAttendance()]);
}

async function handleLogin(event) {
  event.preventDefault();

  state.apiBaseUrl = refs.apiBaseUrlInput.value.trim().replace(/\/$/, "");
  localStorage.setItem("apiBaseUrl", state.apiBaseUrl);

  try {
    const payload = await apiFetch("/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: refs.usernameInput.value.trim(),
        password: refs.passwordInput.value
      })
    });

    state.token = payload.token;
    state.adminName = payload.admin?.name ?? payload.admin?.username ?? "Admin";

    localStorage.setItem("adminToken", state.token);
    localStorage.setItem("adminName", state.adminName);

    renderAuthState();
    await refreshDashboardData();
    showStatus("Login successful.");
  } catch (error) {
    showStatus(error.message || "Login failed.");
  }
}

async function handleCreateEmployee(event) {
  event.preventDefault();

  const formData = new FormData(refs.employeeForm);
  const payload = {
    employeeCode: String(formData.get("employeeCode") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    isActive: formData.get("isActive") === "on"
  };

  try {
    await apiFetch("/admin/employees", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    refs.employeeForm.reset();
    refs.employeeForm.querySelector("input[name='isActive']").checked = true;
    await refreshDashboardData();
    showStatus("Employee created.");
  } catch (error) {
    showStatus(error.message || "Unable to create employee.");
  }
}

async function handleEmployeeTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const employeeId = target.dataset.id;
  const action = target.dataset.action;
  if (!employeeId || !action) {
    return;
  }

  const employee = state.employees.find((entry) => entry.id === employeeId);
  if (!employee) {
    return;
  }

  try {
    if (action === "toggle") {
      await apiFetch(`/admin/employees/${employeeId}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !employee.isActive })
      });
      showStatus("Employee status updated.");
    }

    if (action === "edit") {
      const nextName = window.prompt("Full Name", employee.fullName);
      if (nextName === null) {
        return;
      }
      const nextDepartment = window.prompt("Department", employee.department || "");
      if (nextDepartment === null) {
        return;
      }
      const nextEmail = window.prompt("Email", employee.email || "");
      if (nextEmail === null) {
        return;
      }
      const nextPhone = window.prompt("Phone", employee.phone || "");
      if (nextPhone === null) {
        return;
      }

      await apiFetch(`/admin/employees/${employeeId}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: nextName,
          department: nextDepartment,
          email: nextEmail,
          phone: nextPhone
        })
      });
      showStatus("Employee updated.");
    }

    if (action === "delete") {
      if (!window.confirm(`Delete employee ${employee.employeeCode}?`)) {
        return;
      }

      await apiFetch(`/admin/employees/${employeeId}`, {
        method: "DELETE"
      });
      showStatus("Employee deleted.");
    }

    await refreshDashboardData();
  } catch (error) {
    showStatus(error.message || "Action failed.");
  }
}

async function handleAttendanceFilters(event) {
  event.preventDefault();
  const formData = new FormData(refs.attendanceFilterForm);
  state.attendanceFilters.from = normalizeIsoOrEmpty(String(formData.get("from") ?? ""));
  state.attendanceFilters.to = normalizeIsoOrEmpty(String(formData.get("to") ?? ""));

  try {
    await loadAttendance();
    showStatus("Attendance filters applied.");
  } catch (error) {
    showStatus(error.message || "Unable to load attendance.");
  }
}

function clearAttendanceFilters() {
  state.attendanceFilters = {
    from: "",
    to: ""
  };
  refs.attendanceFilterForm.reset();
  loadAttendance().catch((error) => {
    showStatus(error.message || "Unable to reload attendance.");
  });
}

function logout() {
  state.token = "";
  state.adminName = "";
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminName");
  renderAuthState();
  showStatus("Logged out.");
}

refs.loginForm.addEventListener("submit", handleLogin);
refs.employeeForm.addEventListener("submit", handleCreateEmployee);
refs.employeeTableBody.addEventListener("click", handleEmployeeTableClick);
refs.attendanceFilterForm.addEventListener("submit", handleAttendanceFilters);
refs.clearFiltersButton.addEventListener("click", clearAttendanceFilters);
refs.refreshAllButton.addEventListener("click", () => {
  refreshDashboardData()
    .then(() => showStatus("Dashboard refreshed."))
    .catch((error) => showStatus(error.message || "Unable to refresh dashboard."));
});
refs.logoutButton.addEventListener("click", logout);

async function init() {
  renderAuthState();
  if (state.token) {
    try {
      await refreshDashboardData();
      showStatus("Dashboard loaded.", 1200);
    } catch {
      logout();
    }
  }
}

init();

