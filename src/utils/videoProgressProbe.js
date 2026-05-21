/** Shared webview / IPC video progress probe (movie + TV player). */

export const VIDEO_PROGRESS_PROBE_JS = `
  (() => {
    const v = document.querySelector('video');
    if (!v || !v.duration || v.duration === Infinity) return null;
    if (!v._seekTracked) {
      v._seekTracked = true;
      v.addEventListener('seeked', () => {
        v._lastUserSeek = Date.now();
        v._lastUserSeekTo = v.currentTime;
      });
    }
    return {
      currentTime: v.currentTime,
      duration: v.duration,
      paused: !!v.paused,
      recentUserSeek: v._lastUserSeek ? (Date.now() - v._lastUserSeek < 6000) : false,
      lastUserSeekTo: v._lastUserSeekTo ?? null,
    };
  })()
`;

/**
 * @param {import('react').RefObject} webviewRef
 * @param {{ pipWebContentsId?: number | null, progressViaFrames?: boolean }} opts
 */
export async function probeVideoProgress(webviewRef, opts = {}) {
  const wv = webviewRef?.current;
  if (!wv) return null;

  const { pipWebContentsId = null, progressViaFrames = false } = opts;

  if (pipWebContentsId != null && window.electron?.queryVideoProgress) {
    return window.electron.queryVideoProgress(pipWebContentsId);
  }

  if (progressViaFrames && window.electron?.queryVideoProgress) {
    try {
      return await window.electron.queryVideoProgress(wv.getWebContentsId());
    } catch {
      return null;
    }
  }

  try {
    return await wv.executeJavaScript(VIDEO_PROGRESS_PROBE_JS);
  } catch {
    return null;
  }
}

export function seekWebviewTo(webviewRef, seconds) {
  const wv = webviewRef?.current;
  if (!wv) return Promise.resolve();
  const sec = Math.floor(seconds);
  return wv
    .executeJavaScript(
      `(() => { const v = document.querySelector('video'); if (v) v.currentTime = ${sec}; })()`,
    )
    .catch(() => {});
}
