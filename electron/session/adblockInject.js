/**
 * Encryptic Shield — in-page CSS + script for embed players (scam overlays, fake downloads).
 */

function getAdblockCss() {
  return `
    iframe[src*="doubleclick"],
    iframe[src*="googlesyndication"],
    iframe[src*="googleadservices"],
    iframe[src*="popads"],
    iframe[src*="clickadu"],
    iframe[src*="exoclick"],
    iframe[src*="adsterra"],
    iframe[src*="taboola"],
    iframe[src*="outbrain"],
    iframe[src*="propeller"],
    iframe[src*="ads."],
    iframe[src*="ads/"],
    iframe[src*="banner"],
    iframe[src*="sponsor"],
    iframe[src*="affiliate"],
    iframe[src*="click."],
    [class*="ad-container"],
    [class*="ad_container"],
    [class*="adsbox"],
    [class*="ad-banner"],
    [class*="popup"],
    [class*="pop-under"],
    [id*="ad-container"],
    [id*="popunder"],
    [id*="popup-ad"],
    [id*="banner-ad"],
    div[class*="overlay"][class*="ad"],
    .encryptic-ad-hidden {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      opacity: 0 !important;
      max-height: 0 !important;
      max-width: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      left: -99999px !important;
    }
  `;
}

function getAdblockScript() {
  return `(function() {
    if (window.__encrypticShieldV2) return;
    window.__encrypticShieldV2 = true;

    var SCAM_RE = [
      /download/i,
      /one\\s+more\\s+step/i,
      /click\\s+(here|below|to|allow|continue)/i,
      /continue\\s+to/i,
      /press\\s+allow/i,
      /enable\\s+notifications/i,
      /your\\s+file/i,
      /install\\s+/i,
      /recommended/i,
      /virus/i,
      /malware/i,
      /clean\\s+your/i,
      /you\\s+won/i,
      /congratulations/i,
      /seconds?\\s+left/i,
      /complete\\s+(the\\s+)?step/i,
      /verify\\s+you/i,
      /human\\s+verification/i,
      /captcha/i,
      /unlock\\s+content/i,
      /watch\\s+now\\s+free/i,
      /free\\s+download/i,
      /update\\s+required/i,
      /codec/i,
      /player\\s+update/i
    ];

    var AD_IFRAME_RE = /ads|doubleclick|popads|clickadu|exoclick|taboola|outbrain|sponsor|banner|propeller|adsterra|juicyads|hilltop|onclick|click\\./i;

    function textLooksLikeScam(t) {
      if (!t || t.length < 6 || t.length > 500) return false;
      var s = t.replace(/\\s+/g, ' ').trim();
      if (s.length < 6) return false;
      return SCAM_RE.some(function(re) { return re.test(s); });
    }

    function isVideoRelated(el) {
      if (!el) return false;
      var tag = (el.tagName || '').toUpperCase();
      if (tag === 'VIDEO' || tag === 'AUDIO') return true;
      if (el.closest && (el.closest('video') || el.closest('audio'))) return true;
      return false;
    }

    function isAppUi(el) {
      if (!el) return false;
      var id = el.id || '';
      if (id === '__skip-ui' || id === 'encryptic-shield-style') return true;
      if (el.closest && el.closest('#__skip-ui')) return true;
      return false;
    }

    function hideEl(el) {
      if (!el || el === document.documentElement || el === document.body) return;
      if (isVideoRelated(el)) return;
      el.classList.add('encryptic-ad-hidden');
      try { el.remove(); } catch (e) {}
    }

    function killLargeOverlays() {
      var vw = window.innerWidth || 1;
      var vh = window.innerHeight || 1;
      var all = document.querySelectorAll('body, body *');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (isVideoRelated(el) || isAppUi(el)) continue;
        var st;
        try { st = window.getComputedStyle(el); } catch (e) { continue; }
        if (st.display === 'none' || st.visibility === 'hidden') continue;
        var pos = st.position;
        if (pos !== 'fixed' && pos !== 'sticky' && pos !== 'absolute') continue;
        var z = parseInt(st.zIndex, 10) || 0;
        if (pos === 'absolute' && z < 50) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        var area = r.width * r.height;
        var screenArea = vw * vh;
        if (area < screenArea * 0.12) continue;
        var t = (el.innerText || '').trim();
        if (textLooksLikeScam(t)) { hideEl(el); continue; }
        if (pos === 'fixed' && area > screenArea * 0.35 && z >= 100 && textLooksLikeScam(t)) hideEl(el);
      }
    }

    function scanRoot(root) {
      if (!root || !root.querySelectorAll) return;
      var nodes = root.querySelectorAll(
        'motion.div, div, section, aside, article, p, span, a, button, h1, h2, h3, h4, label, form, iframe'
      );
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (isVideoRelated(el) || isAppUi(el)) continue;
        if (el.tagName === 'IFRAME') {
          var src = (el.src || el.getAttribute('src') || '').toLowerCase();
          if (AD_IFRAME_RE.test(src)) { hideEl(el); continue; }
          var fr = el.getBoundingClientRect();
          if (fr.width > 120 && fr.height > 120) {
            var z = parseInt(window.getComputedStyle(el).zIndex, 10) || 0;
            if (z > 100) hideEl(el);
          }
          continue;
        }
        var t = (el.innerText || el.textContent || '').trim();
        if (!textLooksLikeScam(t)) continue;
        var box = el;
        for (var up = 0; up < 8 && box.parentElement; up++) {
          var st = window.getComputedStyle(box);
          var z = parseInt(st.zIndex, 10) || 0;
          if (st.position === 'fixed' || st.position === 'sticky' || st.position === 'absolute' || z > 30 || up >= 2) {
            hideEl(box);
            break;
          }
          box = box.parentElement;
        }
        if (box === el) hideEl(el);
      }
    }

    function run() {
      try {
        killLargeOverlays();
        scanRoot(document);
      } catch (e) {}
    }

    run();
    var obs = new MutationObserver(function() { run(); });
    if (document.documentElement) {
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    }
    setInterval(run, 800);

    try { window.open = function() { return null; }; } catch (e) {}
    try {
      var _alert = window.alert;
      window.alert = function(m) {
        if (textLooksLikeScam(String(m || ''))) return;
        return _alert.apply(window, arguments);
      };
    } catch (e) {}
  })();`;
}

module.exports = { getAdblockCss, getAdblockScript };
