/**
 * Runs inside every player webview frame (including ad iframes) before page scripts.
 */
const { ipcRenderer } = require("electron");
const { getAdblockCss, getAdblockScript } = require("./session/adblockInject");

const APP_FS_CHANNEL = "encryptic-app-fullscreen";

function requestAppFullscreen() {
  try {
    ipcRenderer.sendToHost(APP_FS_CHANNEL);
  } catch {
    /* not in a webview host */
  }
}

function installAppFullscreenBridge() {
  const proxy = function proxyFullscreen() {
    requestAppFullscreen();
    return Promise.resolve();
  };

  try {
    Element.prototype.requestFullscreen = proxy;
    Element.prototype.webkitRequestFullscreen = proxy;
    if (HTMLVideoElement.prototype.webkitEnterFullscreen) {
      HTMLVideoElement.prototype.webkitEnterFullscreen = function () {
        requestAppFullscreen();
      };
    }
  } catch {
    /* ignore */
  }

  function isFullscreenControl(el) {
    if (!el?.closest) return false;
    const btn = el.closest(
      'button, [role="button"], a, [class*="fullscreen" i], [aria-label*="fullscreen" i], [title*="fullscreen" i]',
    );
    if (!btn) return false;
    const hint = [
      btn.className,
      btn.getAttribute?.("aria-label"),
      btn.getAttribute?.("title"),
      btn.getAttribute?.("data-tooltip"),
      btn.textContent,
    ]
      .join(" ")
      .toLowerCase();
    if (/fullscreen|full-screen|full screen|expand|cinema|theatre|theater/.test(hint)) {
      return true;
    }
    if (btn.querySelector?.("svg")) {
      const v = document.querySelector("video");
      if (v) {
        const vr = v.getBoundingClientRect();
        const br = btn.getBoundingClientRect();
        const inBottomBar =
          br.top > vr.top + vr.height * 0.55 &&
          br.width < 80 &&
          br.height < 80;
        const inBottomRight =
          br.left > vr.left + vr.width * 0.72 &&
          br.top > vr.top + vr.height * 0.55;
        if (inBottomBar && inBottomRight) return true;
      }
    }
    return false;
  }

  document.addEventListener(
    "click",
    (e) => {
      if (!isFullscreenControl(e.target)) return;
      requestAppFullscreen();
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
}

function injectShield() {
  if (typeof document === "undefined") return;

  installAppFullscreenBridge();

  if (!document.getElementById("encryptic-shield-style")) {
    const style = document.createElement("style");
    style.id = "encryptic-shield-style";
    style.textContent = getAdblockCss();
    (document.head || document.documentElement).appendChild(style);
  }

  try {
    // eslint-disable-next-line no-new-func
    new Function(getAdblockScript())();
  } catch {
    /* ignore */
  }
}

injectShield();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectShield, { once: true });
} else {
  injectShield();
}
