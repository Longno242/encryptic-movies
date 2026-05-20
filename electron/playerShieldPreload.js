/**
 * Runs inside every player webview frame (including ad iframes) before page scripts.
 */
const { getAdblockCss, getAdblockScript } = require("./session/adblockInject");

function injectShield() {
  if (typeof document === "undefined") return;

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
