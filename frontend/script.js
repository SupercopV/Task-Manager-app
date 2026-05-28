/* global fetch */

const CONFIG = {
  // Production: set window.TM_API_BASE in config.js (see DEPLOY.md)
  API_BASE:
    localStorage.getItem("tm_api_base") ||
    (typeof window !== "undefined" && window.TM_API_BASE) ||
    "http://127.0.0.1:8000/api",
  TOKEN_KEY: "tm_token",
  THEME_KEY: "tm_theme",
};

function $(sel) {
  return document.querySelector(sel);
}

function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(CONFIG.THEME_KEY, theme);
  updateThemeButtonLabel();
}

function updateThemeButtonLabel() {
  const btn = $("#themeToggle");
  if (!btn) return;
  const isLight = document.documentElement.dataset.theme === "light";
  btn.textContent = isLight ? "Dark mode" : "Light mode";
}

function initTheme() {
  const saved = localStorage.getItem(CONFIG.THEME_KEY);
  if (saved) setTheme(saved);
  else setTheme(window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark");
}

function toast(type, title, body) {
  const host = $("#toastHost");
  if (!host) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <div class="toast-title">${escapeHtml(title)}</div>
    <div class="toast-body">${escapeHtml(body || "")}</div>
  `;
  el.style.borderColor =
    type === "success" ? "rgba(128,237,153,.5)" : type === "error" ? "rgba(255,59,107,.55)" : "var(--border)";
  host.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const isJson = res.headers.get("content-type")?.includes("application/json");
  if (isJson) data = await res.json();

  if (!res.ok) {
    const msg =
      data?.detail ||
      (typeof data === "object" ? Object.values(data).flat().join(" ") : "") ||
      `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("loading", loading);
  btn.disabled = loading;
}

function requireAuthOrRedirect() {
  if (!getToken()) window.location.href = "./login.html";
}

function redirectIfAuthed() {
  if (getToken()) window.location.href = "./dashboard.html";
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "";
  }
}

// --- Login ---
async function bindLogin() {
  const form = $("#loginForm");
  if (!form) return;
  redirectIfAuthed();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type='submit']");
    setLoading(btn, true);
    try {
      const fd = new FormData(form);
      const username = String(fd.get("username") || "").trim();
      const password = String(fd.get("password") || "");
      const data = await api("/login/", { method: "POST", body: { username, password } });
      setToken(data.access);
      toast("success", "Logged in", "Redirecting to dashboard…");
      setTimeout(() => (window.location.href = "./dashboard.html"), 500);
    } catch (err) {
      toast("error", "Login failed", err.message);
    } finally {
      setLoading(btn, false);
    }
  });
}

// --- Register ---
async function bindRegister() {
  const form = $("#registerForm");
  if (!form) return;
  redirectIfAuthed();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type='submit']");
    setLoading(btn, true);
    try {
      const fd = new FormData(form);
      const payload = {
        username: String(fd.get("username") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        password: String(fd.get("password") || ""),
      };
      await api("/register/", { method: "POST", body: payload });

      toast("success", "Account created", "Logging you in…");
      const data = await api("/login/", { method: "POST", body: { username: payload.username, password: payload.password } });
      setToken(data.access);
      setTimeout(() => (window.location.href = "./dashboard.html"), 600);
    } catch (err) {
      toast("error", "Registration failed", err.message);
    } finally {
      setLoading(btn, false);
    }
  });
}

// --- Dashboard ---
let state = {
  tasks: [],
  query: "",
  statusFilter: "",
  draggingTaskId: null,
};

function applyFilters(tasks) {
  const q = state.query.trim().toLowerCase();
  const status = state.statusFilter;
  return tasks.filter((t) => {
    if (status && t.status !== status) return false;
    if (!q) return true;
    const hay = `${t.title} ${t.description || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderBoard() {
  const lanes = {
    TODO: $("#laneTODO"),
    IN_PROGRESS: $("#laneIN_PROGRESS"),
    DONE: $("#laneDONE"),
  };
  Object.values(lanes).forEach((lane) => lane && (lane.innerHTML = ""));

  const filtered = applyFilters(state.tasks);
  const grouped = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const t of filtered) grouped[t.status]?.push(t);

  for (const [status, list] of Object.entries(grouped)) {
    const lane = lanes[status];
    if (!lane) continue;
    for (const t of list) lane.appendChild(renderTaskCard(t));
  }

  $("#countTODO").textContent = `${grouped.TODO.length} task${grouped.TODO.length === 1 ? "" : "s"}`;
  $("#countIN_PROGRESS").textContent = `${grouped.IN_PROGRESS.length} task${grouped.IN_PROGRESS.length === 1 ? "" : "s"}`;
  $("#countDONE").textContent = `${grouped.DONE.length} task${grouped.DONE.length === 1 ? "" : "s"}`;
}

function renderTaskCard(task) {
  const el = document.createElement("article");
  el.className = "task";
  el.draggable = true;
  el.dataset.id = String(task.id);
  el.dataset.status = task.status;

  el.innerHTML = `
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-desc">${escapeHtml(task.description || "")}</div>
    <div class="task-meta">
      <span class="pill">${escapeHtml(formatDate(task.created_at))}</span>
      <div class="task-actions">
        <button class="icon-btn" type="button" data-action="edit">Edit</button>
      </div>
    </div>
  `;

  el.querySelector("[data-action='edit']").addEventListener("click", () => openEdit(task));

  el.addEventListener("dragstart", () => {
    state.draggingTaskId = task.id;
    el.classList.add("dragging");
  });
  el.addEventListener("dragend", () => {
    state.draggingTaskId = null;
    el.classList.remove("dragging");
  });
  return el;
}

async function loadMe() {
  const badge = $("#userBadge");
  if (!badge) return;
  try {
    const me = await api("/me/");
    badge.textContent = `Signed in as ${me.username}`;
  } catch (err) {
    badge.textContent = "Session expired";
    if (err.status === 401) {
      clearToken();
      window.location.href = "./login.html";
    }
  }
}

async function loadTasks() {
  state.tasks = await api("/tasks/");
  renderBoard();
}

async function createTask({ title, description }) {
  const newTask = await api("/tasks/", { method: "POST", body: { title, description, status: "TODO" } });
  state.tasks.unshift(newTask);
  renderBoard();
}

async function updateTask(id, patch) {
  const updated = await api(`/tasks/${id}/`, { method: "PUT", body: patch });
  state.tasks = state.tasks.map((t) => (t.id === id ? updated : t));
  renderBoard();
}

async function deleteTask(id) {
  await api(`/tasks/${id}/`, { method: "DELETE" });
  state.tasks = state.tasks.filter((t) => t.id !== id);
  renderBoard();
}

function openEdit(task) {
  const dialog = $("#editDialog");
  const form = $("#editForm");
  if (!dialog || !form) return;

  form.id.value = String(task.id);
  form.title.value = task.title;
  form.description.value = task.description || "";
  form.status.value = task.status;

  dialog.showModal();
}

function bindDnD() {
  const lanes = document.querySelectorAll(".lane");
  lanes.forEach((lane) => {
    lane.addEventListener("dragover", (e) => {
      e.preventDefault();
      lane.classList.add("dragover");
    });
    lane.addEventListener("dragleave", () => lane.classList.remove("dragover"));
    lane.addEventListener("drop", async (e) => {
      e.preventDefault();
      lane.classList.remove("dragover");
      const status = lane.dataset.lane;
      const id = state.draggingTaskId;
      if (!id || !status) return;
      const existing = state.tasks.find((t) => t.id === id);
      if (existing?.status === status) return;
      try {
        await updateTask(id, { title: existing.title, description: existing.description, status });
        toast("success", "Moved", `Task moved to ${status.replaceAll("_", " ").toLowerCase()}.`);
      } catch (err) {
        toast("error", "Move failed", err.message);
      }
    });
  });
}

async function bindDashboard() {
  const logout = $("#logoutBtn");
  if (!logout) return;
  requireAuthOrRedirect();
  initTheme();

  $("#themeToggle")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    setTheme(next);
    toast("success", "Theme updated", `Switched to ${next} mode.`);
  });
  updateThemeButtonLabel();

  logout.addEventListener("click", () => {
    clearToken();
    toast("success", "Logged out", "See you next time.");
    setTimeout(() => (window.location.href = "./login.html"), 400);
  });

  const refreshBtn = $("#refreshBtn");
  refreshBtn?.addEventListener("click", async () => {
    try {
      refreshBtn.disabled = true;
      await loadTasks();
      toast("success", "Refreshed", "Tasks updated.");
    } catch (err) {
      toast("error", "Refresh failed", err.message);
    } finally {
      refreshBtn.disabled = false;
    }
  });

  $("#searchInput")?.addEventListener("input", (e) => {
    state.query = e.target.value || "";
    renderBoard();
  });

  $("#statusFilter")?.addEventListener("change", (e) => {
    state.statusFilter = e.target.value || "";
    renderBoard();
  });

  const createForm = $("#createTaskForm");
  createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = createForm.querySelector("button[type='submit']");
    setLoading(btn, true);
    try {
      const fd = new FormData(createForm);
      const title = String(fd.get("title") || "").trim();
      const description = String(fd.get("description") || "").trim();
      if (!title) throw new Error("Title is required.");
      await createTask({ title, description });
      createForm.reset();
      toast("success", "Task created", "Added to Todo.");
    } catch (err) {
      toast("error", "Create failed", err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  const editForm = $("#editForm");
  const deleteBtn = $("#deleteBtn");
  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = editForm.querySelector("button[value='save']");
    setLoading(btn, true);
    try {
      const id = Number(editForm.id.value);
      const patch = {
        title: editForm.title.value.trim(),
        description: editForm.description.value.trim(),
        status: editForm.status.value,
      };
      await updateTask(id, patch);
      $("#editDialog")?.close();
      toast("success", "Saved", "Task updated.");
    } catch (err) {
      toast("error", "Save failed", err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  deleteBtn?.addEventListener("click", async () => {
    const id = Number($("#editForm")?.id?.value);
    if (!id) return;
    try {
      deleteBtn.disabled = true;
      await deleteTask(id);
      $("#editDialog")?.close();
      toast("success", "Deleted", "Task removed.");
    } catch (err) {
      toast("error", "Delete failed", err.message);
    } finally {
      deleteBtn.disabled = false;
    }
  });

  try {
    toast("info", "Loading", "Fetching your tasks…");
    await loadMe();
    await loadTasks();
    bindDnD();
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      window.location.href = "./login.html";
    } else {
      toast("error", "Load failed", err.message);
    }
  }
}

function bindLanding() {
  if (!document.body.classList.contains("landing-page")) return;

  $("#themeToggle")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    setTheme(next);
  });
  updateThemeButtonLabel();

  const navToggle = $("#navToggle");
  const navLinks = $("#navLinks");
  navToggle?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  navLinks?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle?.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  reveals.forEach((el) => observer.observe(el));
}

// Boot
initTheme();
bindLanding();
bindLogin();
bindRegister();
bindDashboard();

