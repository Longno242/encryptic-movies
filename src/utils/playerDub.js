/** Injected into embed webviews to switch sub/dub audio inside nested players. */

export function buildDubInjectScript(dubMode) {
  const mode = dubMode === "dub" ? "dub" : "sub";
  return `(function(){
    var mode = ${JSON.stringify(mode)};
    function norm(s){ return (s || '').toLowerCase().trim(); }
    function tryDoc(doc) {
      if (!doc) return false;
      var v = doc.querySelector('video');
      if (v && v.audioTracks && v.audioTracks.length > 1) {
        var picked = false;
        for (var i = 0; i < v.audioTracks.length; i++) {
          var t = v.audioTracks[i];
          var L = norm(t.language || t.label || '');
          var isEn = L.indexOf('en') === 0 || L.indexOf('english') >= 0 || L.indexOf('dub') >= 0;
          var isOrig = L.indexOf('ja') === 0 || L.indexOf('japan') >= 0 || L.indexOf('sub') >= 0;
          var enable = mode === 'dub' ? isEn : (isOrig || !isEn);
          t.enabled = enable;
          if (enable) picked = true;
        }
        if (picked) return true;
      }
      var labels = mode === 'dub'
        ? ['english', 'dub', 'dubbed', 'eng', 'en audio', 'audio: en']
        : ['japanese', 'original', 'sub', 'subbed', 'jpn', 'ja audio', 'audio: ja', 'native'];
      var nodes = doc.querySelectorAll(
        'button,[role="button"],a,li,span,div,label,input[type="button"]'
      );
      for (var n = 0; n < nodes.length; n++) {
        var el = nodes[n];
        var t = norm(el.textContent || el.getAttribute('aria-label') || el.title || '');
        if (!t || t.length > 32) continue;
        for (var j = 0; j < labels.length; j++) {
          if (t === labels[j] || t.indexOf(labels[j]) >= 0) {
            el.click();
            return true;
          }
        }
      }
      var sel = doc.querySelectorAll('select');
      for (var s = 0; s < sel.length; s++) {
        var opts = sel[s].options;
        for (var o = 0; o < opts.length; o++) {
          var ot = norm(opts[o].text || '');
          for (var k = 0; k < labels.length; k++) {
            if (ot.indexOf(labels[k]) >= 0) {
              sel[s].selectedIndex = o;
              sel[s].dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }
      }
      var iframes = doc.querySelectorAll('iframe');
      for (var f = 0; f < iframes.length; f++) {
        try {
          if (tryDoc(iframes[f].contentDocument)) return true;
        } catch (e) {}
      }
      return false;
    }
    return tryDoc(document);
  })()`;
}

/** Retry injection — embed players load nested iframes slowly. */
export async function applyDubInWebview(webview, dubMode) {
  if (!webview?.executeJavaScript) return false;
  const script = buildDubInjectScript(dubMode);
  for (const waitMs of [0, 600, 1500, 3000, 5000]) {
    if (waitMs) await new Promise((r) => setTimeout(r, waitMs));
    try {
      const ok = await webview.executeJavaScript(script);
      if (ok) return true;
    } catch {
      /* cross-origin iframe — wait for more nesting */
    }
  }
  return false;
}
