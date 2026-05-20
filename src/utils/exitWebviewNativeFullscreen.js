/** Keep embed video in-document when using Encryptic in-app fullscreen. */
export const EXIT_WEBVIEW_NATIVE_FULLSCREEN = `(function() {
  try {
    var el = document.fullscreenElement || document.webkitFullscreenElement;
    if (!el) return;
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(function() {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  } catch (e) {}
})();`;

export function exitWebviewNativeFullscreen(webviewEl) {
  if (!webviewEl?.executeJavaScript) return;
  webviewEl.executeJavaScript(EXIT_WEBVIEW_NATIVE_FULLSCREEN, false).catch(() => {});
}
