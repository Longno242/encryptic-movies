/** Enable subtitle / CC tracks inside nested embed players. */

export function buildSubtitleInjectScript(
  preferredLangName = "English",
  enabled = true,
) {
  const pref = String(preferredLangName || "English").toLowerCase();
  const prefCode = pref.slice(0, 2);
  const labels = [
    pref,
    prefCode,
    "english",
    "eng",
    "en",
    "sub",
    "subtitles",
    "cc",
    "closed captions",
    "captions",
  ];
  return `(function(){
    var enabled = ${enabled ? "true" : "false"};
    var labels = ${JSON.stringify(labels)};
    function norm(s){ return (s || '').toLowerCase().trim(); }
    function matchLang(s) {
      var t = norm(s);
      if (!t) return false;
      for (var i = 0; i < labels.length; i++) {
        var L = labels[i];
        if (t === L || t.indexOf(L) === 0 || t.indexOf('(' + L) >= 0) return true;
      }
      return false;
    }
    function tryDoc(doc) {
      if (!doc) return false;
      var v = doc.querySelector('video');
      if (v && v.textTracks && v.textTracks.length) {
        var picked = false;
        for (var i = 0; i < v.textTracks.length; i++) {
          var tr = v.textTracks[i];
          if (tr.kind !== 'subtitles' && tr.kind !== 'captions') continue;
          var on = enabled && matchLang(tr.language || tr.label || '');
          if (!picked && enabled && !on && tr.kind === 'subtitles') {
            on = true;
          }
          tr.mode = on ? 'showing' : 'disabled';
          if (on) picked = true;
        }
        if (picked) return true;
      }
      var nodes = doc.querySelectorAll(
        'button,[role="button"],a,li,span,div,label,input[type="button"]'
      );
      for (var n = 0; n < nodes.length; n++) {
        var el = nodes[n];
        var t = norm(el.textContent || el.getAttribute('aria-label') || el.title || '');
        if (!t || t.length > 40) continue;
        if (/^cc$|^subtitles?$|^captions?$|^subs?$/.test(t) ||
            t.indexOf('subtitle') >= 0 || t.indexOf('caption') >= 0) {
          el.click();
          return true;
        }
        if (enabled && matchLang(t)) {
          el.click();
          return true;
        }
      }
      var sel = doc.querySelectorAll('select');
      for (var s = 0; s < sel.length; s++) {
        var opts = sel[s].options;
        for (var o = 0; o < opts.length; o++) {
          if (enabled && matchLang(opts[o].text || '')) {
            sel[s].selectedIndex = o;
            sel[s].dispatchEvent(new Event('change', { bubbles: true }));
            return true;
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

export async function applySubtitlesInWebview(
  webview,
  preferredLangName = "English",
  enabled = true,
) {
  if (!webview?.executeJavaScript) return false;
  const script = buildSubtitleInjectScript(preferredLangName, enabled);
  for (const waitMs of [0, 800, 2000, 4000, 7000]) {
    if (waitMs) await new Promise((r) => setTimeout(r, waitMs));
    try {
      const ok = await webview.executeJavaScript(script);
      if (ok) return true;
    } catch {
      /* cross-origin iframe */
    }
  }
  return false;
}
