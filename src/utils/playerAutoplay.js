/** Nudge nested embed players to start playback; restore audio after autoplay. */

function walkDocsScript(inner) {
  return `(function(){
    function walk(doc) {
      if (!doc) return false;
      ${inner}
      var iframes = doc.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        try { if (walk(iframes[i].contentDocument)) return true; } catch (e) {}
      }
      return false;
    }
    return walk(document);
  })()`;
}

export function buildAutoplayNudgeScript() {
  return walkDocsScript(`
      var v = doc.querySelector('video');
      if (v) {
        try {
          v.muted = false;
          v.volume = Math.max(v.volume || 0, 1);
          var p = v.play();
          if (p && p.catch) {
            p.catch(function() {
              try {
                v.muted = true;
                v.play().catch(function() {});
              } catch (e) {}
            });
          }
          if (v.readyState >= 2 && !v.paused) return true;
        } catch (e) {}
      }
      var nodes = doc.querySelectorAll('button,[role="button"],a');
      for (var n = 0; n < nodes.length; n++) {
        var el = nodes[n];
        var t = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
        if (/^\\s*play\\s*$|watch now|click to play|tap to play|▶|start|unmute/i.test(t)) {
          el.click();
          return true;
        }
      }
  `);
}

export function buildRestoreAudioScript() {
  return walkDocsScript(`
      var v = doc.querySelector('video');
      if (v) {
        try {
          v.muted = false;
          v.defaultMuted = false;
          if (v.volume === 0) v.volume = 1;
        } catch (e) {}
        return true;
      }
  `);
}

async function runInWebview(webview, script) {
  if (!webview?.executeJavaScript) return false;
  try {
    return !!(await webview.executeJavaScript(script));
  } catch {
    return false;
  }
}

export async function nudgeEmbedPlayback(webview) {
  const script = buildAutoplayNudgeScript();
  for (const waitMs of [400, 1200, 2500]) {
    if (waitMs) await new Promise((r) => setTimeout(r, waitMs));
    if (await runInWebview(webview, script)) {
      await restoreEmbedAudio(webview);
      return true;
    }
  }
  return false;
}

export async function restoreEmbedAudio(webview) {
  const script = buildRestoreAudioScript();
  for (const waitMs of [0, 500, 1500, 3000]) {
    if (waitMs) await new Promise((r) => setTimeout(r, waitMs));
    await runInWebview(webview, script);
  }
}
