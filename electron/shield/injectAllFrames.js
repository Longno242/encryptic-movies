/**
 * Inject Encryptic Shield CSS + script into every frame of player webContents.
 */

const { webFrameMain } = require("electron");
const { getAdblockCss, getAdblockScript } = require("../session/adblockInject");

let cachedCss;
let cachedScript;

function shieldPayload() {
  if (!cachedCss) cachedCss = getAdblockCss();
  if (!cachedScript) cachedScript = getAdblockScript();
  return { css: cachedCss, script: cachedScript };
}

function isInjectableFrame(frame) {
  if (!frame) return false;
  try {
    if (typeof frame.isDestroyed === "function" && frame.isDestroyed()) return false;
    return (
      typeof frame.insertCSS === "function" &&
      typeof frame.executeJavaScript === "function"
    );
  } catch {
    return false;
  }
}

function injectFrame(frame) {
  if (!isInjectableFrame(frame)) return;
  const { css, script } = shieldPayload();
  frame.insertCSS(css).catch(() => {});
  frame.executeJavaScript(script, true).catch(() => {});
}

function walkFrames(frame) {
  if (!isInjectableFrame(frame)) return;
  injectFrame(frame);
  for (const child of frame.frames || []) {
    walkFrames(child);
  }
}

/**
 * @param {import('electron').WebContents} wc
 */
function injectEncrypticShieldAllFrames(wc) {
  if (!wc || wc.isDestroyed()) return;
  try {
    walkFrames(wc.mainFrame);
  } catch {
    /* ignore */
  }
}

/**
 * @param {import('electron').WebContents} wc
 * @param {boolean} isPlayer
 */
function attachShieldToWebContents(wc, isPlayer) {
  if (!isPlayer || !wc) return;

  const run = () => injectEncrypticShieldAllFrames(wc);

  wc.on("did-finish-load", run);
  wc.on("did-navigate-in-page", run);

  wc.on("did-frame-finish-load", (_event, _isMain, frameProcessId, frameRoutingId) => {
    try {
      const frame = webFrameMain.fromId(frameProcessId, frameRoutingId);
      if (frame) injectFrame(frame);
    } catch {
      run();
    }
  });

  // Never use the frame object from this event — shape varies by Electron version.
  wc.on("frame-created", () => {
    setTimeout(run, 100);
  });

  run();
}

module.exports = {
  injectEncrypticShieldAllFrames,
  attachShieldToWebContents,
};
