/**
 * Persists and streams ad-block hit counts to the renderer.
 */

const { app } = require("electron");
const path = require("path");
const fs = require("fs");

const statsPath = () => path.join(app.getPath("userData"), "blockStats.json");

let totals = { total: 0, domains: {} };
let pendingBatch = null;
let notifyTimer = null;
let persistTimer = null;
let getMainWindow = () => null;

function init(getWindow) {
  getMainWindow = getWindow;
}

function loadBlockStats() {
  try {
    const parsed = JSON.parse(fs.readFileSync(statsPath(), "utf8"));
    totals = {
      total: parsed.total || 0,
      domains: parsed.domains || {},
    };
  } catch {
    totals = { total: 0, domains: {} };
  }
}

function persist() {
  try {
    fs.writeFileSync(
      statsPath(),
      JSON.stringify({ total: totals.total, domains: totals.domains }),
    );
  } catch {
    /* ignore */
  }
}

function recordBlockedRequest(url) {
  let domain;
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return;
  }

  totals.total++;
  totals.domains[domain] = (totals.domains[domain] || 0) + 1;

  if (!pendingBatch) pendingBatch = { total: 0, domains: {} };
  pendingBatch.total++;
  pendingBatch.domains[domain] = (pendingBatch.domains[domain] || 0) + 1;

  if (notifyTimer) clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    const win = getMainWindow();
    if (win && !win.isDestroyed() && pendingBatch) {
      win.webContents.send("blocked-stats-update", pendingBatch);
    }
    pendingBatch = null;
  }, 250);

  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 3000);
}

function getBlockStats() {
  return { total: totals.total, domains: totals.domains };
}

module.exports = {
  init,
  loadBlockStats,
  recordBlockedRequest,
  getBlockStats,
};
