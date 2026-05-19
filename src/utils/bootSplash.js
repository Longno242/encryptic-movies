/** Boot / startup screen — step progress and time remaining */

const MIN_SPLASH_MS = 5000;
const ESTIMATED_TOTAL_MS = 5000;
const STEP_ORDER = ["engine", "secure", "api", "ui"];

const bootStarted =
  typeof performance !== "undefined" ? performance.now() : Date.now();

let dismissed = false;
let finishRequested = false;
let timeTimer = null;

function $(id) {
  return document.getElementById(id);
}

function formatTimeRemaining(ms) {
  const sec = Math.max(1, Math.ceil(ms / 1000));
  return sec === 1 ? "About 1 second remaining" : `About ${sec} seconds remaining`;
}

function updateTimeRemaining() {
  const el = $("boot-splash-eta");
  if (!el || dismissed) return;
  const elapsed = performance.now() - bootStarted;
  const progress = Number($("boot-splash")?.dataset?.progress || 0);
  const estimatedLeft = ESTIMATED_TOTAL_MS * (1 - progress / 100);
  const minLeft = Math.max(0, MIN_SPLASH_MS - elapsed);
  const remaining = Math.max(estimatedLeft, minLeft);
  el.textContent =
    remaining <= 800 ? "Almost ready…" : formatTimeRemaining(remaining);
}

function highlightStep(activeStep) {
  const steps = document.querySelectorAll("#boot-splash-steps [data-step]");
  if (!steps.length) return;

  const activeIdx = STEP_ORDER.indexOf(activeStep);

  steps.forEach((el) => {
    const idx = STEP_ORDER.indexOf(el.dataset.step);
    el.classList.remove("boot-splash-step--active", "boot-splash-step--done");
    if (activeIdx >= 0 && idx < activeIdx) {
      el.classList.add("boot-splash-step--done");
    } else if (el.dataset.step === activeStep) {
      el.classList.add("boot-splash-step--active");
    }
  });
}

function markAllStepsDone() {
  document
    .querySelectorAll("#boot-splash-steps [data-step]")
    .forEach((el) => {
      el.classList.remove("boot-splash-step--active");
      el.classList.add("boot-splash-step--done");
    });
}

function startEtaTimer() {
  if (timeTimer) return;
  timeTimer = setInterval(updateTimeRemaining, 200);
}

function stopEtaTimer() {
  if (timeTimer) {
    clearInterval(timeTimer);
    timeTimer = null;
  }
}

/**
 * @param {string} label - Current task description
 * @param {number} progress - 0–100 overall progress
 * @param {string} [activeStep] - engine | secure | api | ui
 */
export function bootStep(label, progress, activeStep) {
  if (dismissed) return;

  const pctVal = Math.min(100, Math.max(0, progress));
  const splash = $("boot-splash");
  const status = $("boot-splash-status");
  const pct = $("boot-splash-pct");
  const fill = $("boot-splash-bar-fill");
  const bar = document.querySelector(".boot-splash-bar");

  if (splash) splash.dataset.progress = String(pctVal);
  if (status) status.textContent = label;
  if (pct) pct.textContent = `${Math.round(pctVal)}%`;
  if (fill) {
    fill.style.width = `${pctVal}%`;
    fill.style.animation = "none";
  }
  if (bar) bar.setAttribute("aria-valuenow", String(Math.round(pctVal)));

  if (activeStep) highlightStep(activeStep);
  updateTimeRemaining();
}

/** Mark startup complete — animates to 100% then dismisses */
export function bootFinish(finalLabel = "Launch complete") {
  if (dismissed || finishRequested) return;
  finishRequested = true;

  bootStep(finalLabel, 100);
  markAllStepsDone();
  const eta = $("boot-splash-eta");
  if (eta) eta.textContent = "Starting now…";

  const elapsed = performance.now() - bootStarted;
  const wait = Math.max(400, MIN_SPLASH_MS - elapsed);

  setTimeout(() => dismissBootSplash(), wait);
}

export function dismissBootSplash() {
  if (dismissed) return;
  const el = $("boot-splash");
  if (!el) return;

  dismissed = true;
  stopEtaTimer();

  const elapsed = performance.now() - bootStarted;
  const wait = Math.max(0, MIN_SPLASH_MS - elapsed);

  setTimeout(() => {
    el.setAttribute("aria-busy", "false");
    el.classList.add("boot-splash--out");
    setTimeout(() => el.remove(), 560);
  }, wait);
}

export function initBootSplash() {
  bootStep("Starting Encryptic Movies…", 4, "engine");
  startEtaTimer();
}

if (typeof document !== "undefined") {
  const run = () => initBootSplash();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
}
