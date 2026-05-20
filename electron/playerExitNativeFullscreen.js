/** Exit HTML5 fullscreen inside embed players so in-app CSS fullscreen can show video. */
const EXIT_NATIVE_FULLSCREEN_SCRIPT = `(function() {
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

module.exports = { EXIT_NATIVE_FULLSCREEN_SCRIPT };
