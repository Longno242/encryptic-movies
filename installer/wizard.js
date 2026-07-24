/**
 * Encryptic Movies — hybrid installer wizard
 */

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "location", label: "Location" },
  { id: "install", label: "Install" },
  { id: "done", label: "Finish" },
];

const byId = (id) => document.getElementById(id);

let stepIndex = 0;
let pendingUpdate = null;
let movies = [];
let movieIndex = 0;
let movieTimer = null;
let progressUnsub = null;

let config = {
  appName: "Encryptic Movies",
  exeName: "Encryptic Movies.exe",
  installDir: "",
  exePath: "",
  installedVersion: null,
  installed: false,
  payloadAvailable: false,
};

function joinPath(dir, file) {
  const sep = dir.includes("\\") ? "\\" : "/";
  return dir.replace(/[\\/]+$/, "") + sep + file;
}

function showPanel(stepId) {
  for (const step of STEPS) {
    const panel = byId(`panel-${step.id}`);
    if (panel) panel.classList.toggle("installer-panel--hidden", step.id !== stepId);
  }
  renderStepNav();
  updateFooter();
}

function renderStepNav() {
  const nav = byId("step-nav");
  if (!nav) return;
  nav.innerHTML = STEPS.map((s, i) => {
    let cls = "installer-step-pill";
    if (i === stepIndex) cls += " active";
    else if (i < stepIndex) cls += " done";
    return `<span class="${cls}">${s.label}</span>`;
  }).join("");
}

function updateFooter() {
  const back = byId("btn-back");
  const next = byId("btn-next");
  const cancel = byId("btn-cancel");
  const step = STEPS[stepIndex];

  back.classList.toggle("is-hidden", stepIndex === 0 || step.id === "install");
  cancel.classList.toggle("is-hidden", step.id === "install" || step.id === "done");

  if (step.id === "welcome") {
    next.textContent = "Continue";
    next.disabled = false;
  } else if (step.id === "location") {
    if (config.installed) {
      next.textContent = "Reinstall";
    } else {
      next.textContent = "Install now";
    }
    next.disabled = !config.installDir;
  } else if (step.id === "done") {
    next.textContent = "Done";
    next.disabled = false;
  }
}

async function refreshStatus() {
  const status = await window.installerApi.getStatus(config.installDir);
  config.installed = status.installed;
  config.installedVersion = status.version;
  config.exePath = status.exePath;
  const el = byId("side-installed-version");
  if (el) {
    el.textContent = status.installed
      ? `v${status.version} · Installed`
      : "Not installed";
  }
  byId("btn-repair").disabled = !status.installed;
  byId("btn-uninstall").disabled = !status.installed;
}

function setSideVersion() {
  refreshStatus();
}

function showLocationError(message) {
  const el = byId("location-error");
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.classList.remove("is-hidden");
  } else {
    el.textContent = "";
    el.classList.add("is-hidden");
  }
}

function updateExePreview() {
  const dir = (byId("install-path")?.value || config.installDir || "").trim();
  config.installDir = dir;
  config.exePath = dir ? joinPath(dir, config.exeName) : "";
  const preview = byId("exe-preview-path");
  if (preview) preview.textContent = config.exePath || "—";
  showLocationError("");
  updateFooter();
  refreshStatus();
}

/* ── Movie showcase ─────────────────────────────────────────────────────── */

async function renderMovieSlide() {
  if (!movies.length) return;
  const m = movies[movieIndex];
  const img = byId("showcase-img");
  const showcase = byId("movie-showcase");
  const title = byId("showcase-title");
  const year = byId("showcase-year");
  const dots = byId("showcase-dots");

  if (title) title.textContent = m.title;
  if (year) year.textContent = String(m.year);

  if (dots) {
    dots.innerHTML = movies
      .map(
        (_, i) =>
          `<span class="installer-showcase__dot${i === movieIndex ? " active" : ""}"></span>`,
      )
      .join("");
  }

  if (!img || !window.installerApi?.fetchPoster) {
    showcase?.classList.add("showcase--no-img");
    return;
  }

  img.classList.add("is-fade");
  showcase?.classList.remove("showcase--no-img");

  try {
    const dataUrl = await window.installerApi.fetchPoster(m);
    img.onload = () => img.classList.remove("is-fade");
    img.onerror = () => {
      img.classList.add("is-error");
      showcase?.classList.add("showcase--no-img");
    };
    img.src = dataUrl;
    if (img.complete && img.naturalWidth > 0) {
      img.classList.remove("is-fade");
    }
  } catch {
    img.classList.add("is-error");
    showcase?.classList.add("showcase--no-img");
    img.classList.remove("is-fade");
  }
}

function startMovieCarousel(list) {
  movies = list || [];
  if (!movies.length) return;
  movieIndex = 0;
  renderMovieSlide();
  if (movieTimer) clearInterval(movieTimer);
  movieTimer = window.setInterval(() => {
    movieIndex = (movieIndex + 1) % movies.length;
    renderMovieSlide();
  }, 5000);
}

/* ── Modals ───────────────────────────────────────────────────────────────── */

function openModal(id) {
  if (typeof id !== "string" || !/^[a-z0-9-]+$/i.test(id)) return;
  byId(id)?.classList.remove("is-hidden");
}

function closeModal(id) {
  if (typeof id !== "string" || !/^[a-z0-9-]+$/i.test(id)) return;
  byId(id)?.classList.add("is-hidden");
}

document.addEventListener("click", (e) => {
  const closeId = e.target.closest("[data-close]")?.getAttribute("data-close");
  if (closeId) closeModal(closeId);
});

/* ── Progress-driven install / repair / uninstall ───────────────────────── */

function bindProgress() {
  if (progressUnsub) progressUnsub();
  progressUnsub = window.installerApi.onProgress(({ pct, label }) => {
    const fill = byId("install-progress-fill");
    const pctEl = byId("install-progress-pct");
    const status = byId("install-status-text");
    if (fill) fill.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
    if (status && label) status.textContent = label;
  });
}

async function runSimulatedInstall(isRepair) {
  const statusEl = byId("install-status-text");
  const fillEl = byId("install-progress-fill");
  const pctEl = byId("install-progress-pct");
  const listEl = byId("install-task-list");

  const tasks = isRepair
    ? [
        "Verifying install folder",
        "Refreshing Encryptic Movies.exe (preview)",
        "Updating shortcuts",
        "Finalizing repair",
      ]
    : [
        "Creating install folder",
        "Copying app (preview — build with npm run dist:win-desktop for real files)",
        "Writing version info",
        "Creating shortcuts",
        "Finalizing",
      ];

  listEl.innerHTML = tasks.map((t) => `<li>${t}</li>`).join("");
  const items = listEl.querySelectorAll("li");

  for (let i = 0; i < tasks.length; i++) {
    statusEl.textContent = tasks[i] + "…";
    const pct = ((i + 1) / tasks.length) * 100;
    fillEl.style.width = `${pct}%`;
    pctEl.textContent = `${Math.round(pct)}%`;
    items[i]?.classList.add("done");
    await delay(450 + i * 100);
  }
}

async function runInstallFlow(mode) {
  const isRepair = mode === "repair";
  byId("install-heading").textContent = isRepair ? "Repairing" : "Installing";
  stepIndex = 2;
  showPanel("install");
  byId("btn-next").disabled = true;
  byId("install-task-list").innerHTML = "";

  const opts = {
    installDir: config.installDir,
    desktopShortcut: byId("opt-desktop").checked,
    startMenuShortcut: byId("opt-startmenu").checked,
  };

  try {
    if (!config.payloadAvailable) {
      if (config.previewInstallAllowed) {
        await runSimulatedInstall(isRepair);
        stepIndex = 3;
        showPanel("done");
        finishScreen(isRepair ? "repair" : "install", true);
        return;
      }
      throw new Error(
        "Install package missing. Build the setup with: npm run dist:win-setup",
      );
    }

    bindProgress();
    if (isRepair) {
      await window.installerApi.runRepair(opts);
    } else {
      await window.installerApi.runInstall(opts);
    }
    await refreshStatus();
    config.installedVersion = (await window.installerApi.getStatus(config.installDir)).version;
    stepIndex = 3;
    showPanel("done");
    finishScreen(isRepair ? "repair" : "install", false);
    if (byId("opt-open").checked && config.exePath) {
      try {
        window.installerApi.launchApp(config.exePath);
      } catch {
        /* exe missing */
      }
    }
  } catch (err) {
    const msg = err?.message || "Operation failed.";
    byId("install-status-text").textContent = msg;
    showLocationError(msg);
    byId("btn-next").disabled = false;
    stepIndex = 1;
    showPanel("location");
  }
}

async function runUninstall() {
  closeModal("uninstall-overlay");
  stepIndex = 2;
  showPanel("install");
  byId("install-heading").textContent = "Uninstalling";
  byId("btn-next").disabled = true;
  bindProgress();

  try {
    await window.installerApi.runUninstall({
      installDir: config.installDir,
      removeUserData: byId("opt-remove-data").checked,
    });
    await refreshStatus();
    byId("install-heading").textContent = "Removed";
    byId("install-status-text").textContent = byId("opt-remove-data").checked
      ? "App and personal data were removed."
      : "App removed. Your watch history was kept in AppData.";
    byId("install-progress-fill").style.width = "100%";
    byId("install-progress-pct").textContent = "100%";
    window.setTimeout(() => {
      stepIndex = 0;
      showPanel("welcome");
    }, 2200);
  } catch (err) {
    byId("install-status-text").textContent = err?.message || "Uninstall failed.";
    stepIndex = 0;
    showPanel("welcome");
  }
}

function finishScreen(mode, isPreview) {
  byId("done-exe-path").textContent = config.exePath;
  const note = byId("done-shortcuts-note");
  if (isPreview) {
    note.textContent =
      "Preview run complete (no .exe copied). Build the app with npm run dist:win-desktop, then install again for a real setup.";
    return;
  }
  if (mode === "repair") {
    note.textContent =
      "Repair complete. App files were refreshed; your watch history and settings are unchanged.";
    return;
  }
  const parts = [];
  if (byId("opt-desktop").checked) parts.push("desktop shortcut");
  if (byId("opt-startmenu").checked) parts.push("Start menu");
  note.textContent = parts.length
    ? `Created: ${parts.join(", ")}.`
    : "Installation complete.";
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Updates ──────────────────────────────────────────────────────────────── */

function resetUpdateOverlay() {
  pendingUpdate = null;
  byId("update-title").textContent = "Checking…";
  byId("update-message").textContent = "";
  byId("update-versions").classList.add("is-hidden");
  byId("update-changelog").classList.add("is-hidden");
  byId("update-github-link-wrap")?.classList.add("is-hidden");
  byId("update-progress-wrap").classList.add("is-hidden");
  byId("update-btn-install").classList.add("is-hidden");
}

function showUpdateGithubLink(releaseUrl) {
  const wrap = byId("update-github-link-wrap");
  const link = byId("update-github-link");
  if (!wrap || !link || !releaseUrl) return;
  link.href = releaseUrl;
  link.onclick = (e) => {
    e.preventDefault();
    window.installerApi?.openExternal?.(releaseUrl);
  };
  wrap.classList.remove("is-hidden");
}

async function runUpdateCheck() {
  const btn = byId("btn-check-updates");
  btn.disabled = true;
  resetUpdateOverlay();
  openModal("update-overlay");
  byId("update-title").textContent = "Checking for updates…";

  try {
    const result = await window.installerApi.checkUpdates(config.installDir);
    pendingUpdate = result;

    if (!result.hasUpdate) {
      byId("update-title").textContent = "You're up to date";
      byId("update-message").textContent = `v${result.current} is the latest.`;
      if (result.releaseUrl) showUpdateGithubLink(result.releaseUrl);
      return;
    }

    byId("update-title").textContent = result.isDemo ? "Update preview" : "Update ready";
    byId("update-message").textContent = result.isDemo
      ? "Demo update — connect GitHub in github.config.json for real releases."
      : `Upgrade from v${result.current} to v${result.latest}. Download the new build from GitHub if repair does not apply.`;
    if (result.releaseUrl) showUpdateGithubLink(result.releaseUrl);
    byId("update-current").textContent = `v${result.current}`;
    byId("update-latest").textContent = `v${result.latest}`;
    byId("update-versions").classList.remove("is-hidden");
    if (result.changelog) {
      byId("update-changelog").textContent = result.changelog.replace(/\*\*/g, "");
      byId("update-changelog").classList.remove("is-hidden");
    }
    byId("update-btn-install").classList.remove("is-hidden");
  } catch (err) {
    byId("update-title").textContent = "Check failed";
    byId("update-message").textContent = err?.message || "Could not reach update server.";
  } finally {
    btn.disabled = false;
  }
}

async function runUpdateInstall() {
  if (!pendingUpdate?.hasUpdate) return;
  closeModal("update-overlay");
  await runInstallFlow("repair");
}

/* ── Init & navigation ────────────────────────────────────────────────────── */

async function init() {
  if (!window.installerApi) {
    document.body.innerHTML =
      "<p style='padding:24px;color:#fff'>Run: npm run installer:preview</p>";
    return;
  }

  const defaults = await window.installerApi.getDefaults();
  Object.assign(config, {
    appName: defaults.appName,
    exeName: defaults.exeName,
    installDir: defaults.installDir,
    exePath: defaults.exePath,
    installedVersion: defaults.installedVersion,
    installed: defaults.installed,
    payloadAvailable: defaults.payloadAvailable,
    previewInstallAllowed: defaults.previewInstallAllowed,
  });

  byId("app-name-welcome").textContent = config.appName;
  byId("app-name-done").textContent = config.appName;
  byId("exe-name-label").textContent = config.exeName;
  byId("install-path").value = config.installDir;
  byId("side-tagline").textContent = defaults.spotlight?.tagline || "";
  byId("side-subtitle").textContent = defaults.spotlight?.subtitle || "";
  byId("payload-warning").classList.toggle("is-hidden", config.payloadAvailable);
  byId("location-preview-hint")?.classList.toggle(
    "is-hidden",
    !config.previewInstallAllowed,
  );

  startMovieCarousel(defaults.spotlight?.movies);
  updateExePreview();

  renderStepNav();
  showPanel("welcome");

  byId("btn-minimize").addEventListener("click", () => window.installerApi.minimize());
  byId("btn-win-close").addEventListener("click", () => window.installerApi.close());
  byId("btn-browse").addEventListener("click", async () => {
    const picked = await window.installerApi.pickDirectory(config.installDir);
    if (picked) {
      byId("install-path").value = picked;
      updateExePreview();
    }
  });
  byId("install-path")?.addEventListener("input", () => updateExePreview());
  byId("install-path")?.addEventListener("change", () => updateExePreview());
  byId("btn-cancel").addEventListener("click", () => window.installerApi.close());
  byId("btn-back").addEventListener("click", () => {
    if (stepIndex > 0) {
      stepIndex -= 1;
      showPanel(STEPS[stepIndex].id);
    }
  });
  byId("btn-next").addEventListener("click", () => onNext());

  byId("btn-check-updates").addEventListener("click", () => runUpdateCheck());
  byId("update-close").addEventListener("click", () => closeModal("update-overlay"));
  byId("update-btn-dismiss").addEventListener("click", () => closeModal("update-overlay"));
  byId("update-btn-install").addEventListener("click", () => runUpdateInstall());

  byId("btn-repair").addEventListener("click", () => openModal("repair-overlay"));
  byId("repair-confirm").addEventListener("click", () => {
    closeModal("repair-overlay");
    runInstallFlow("repair");
  });

  byId("btn-uninstall").addEventListener("click", () => openModal("uninstall-overlay"));
  byId("uninstall-confirm").addEventListener("click", () => runUninstall());
}

async function onNext() {
  const step = STEPS[stepIndex];
  if (step.id === "welcome") {
    stepIndex = 1;
    showPanel("location");
    return;
  }
  if (step.id === "location") {
    updateExePreview();
    if (!config.installDir) {
      showLocationError("Choose an install folder (Browse or type a path).");
      return;
    }
    const validation = await window.installerApi.validatePath(config.installDir);
    if (!validation?.ok) {
      showLocationError(validation?.error || "This folder cannot be used.");
      return;
    }
    await runInstallFlow("install");
    return;
  }
  if (step.id === "done") {
    window.installerApi.close();
  }
}

init();
