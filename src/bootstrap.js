import { secureStorage } from "./utils/storage";
import {
  bootStep,
  bootFinish,
  resetBootSplash,
  armBootSplashSafety,
} from "./utils/bootSplash";
import { withTimeout } from "./utils/withTimeout";

function fetchConfig(apiKey) {
  const opts = { headers: { Authorization: `Bearer ${apiKey}` } };
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    opts.signal = AbortSignal.timeout(10000);
  }
  return fetch("https://api.themoviedb.org/3/configuration", opts);
}

/**
 * Runs before React mounts so the splash is not stuck at 4% if App fails to load.
 * @returns {Promise<{ apiKey: string | null, apiKeyStatus: string }>}
 */
export async function runAppBootstrap(onStatus) {
  resetBootSplash();
  const status = (label) => onStatus?.(label);

  let finished = false;
  const complete = (apiKey, apiKeyStatus = "ok") => {
    if (finished) return { apiKey, apiKeyStatus };
    finished = true;
    return { apiKey, apiKeyStatus };
  };

  armBootSplashSafety(() => {
    if (!finished) complete(null, "ok");
  });

  try {
    bootStep("Initializing…", 12, "engine");
    status("Initializing…");
    bootStep("Opening secure storage…", 30, "secure");
    status("Opening secure storage…");
    const val = await withTimeout(secureStorage.get("apikey"), 8000, null);

    bootStep("Connecting to TMDB…", 50, "api");
    status("Connecting to TMDB…");

    let apiKeyStatus = "ok";
    if (val) {
      bootStep("Verifying TMDB token…", 65, "api");
      status("Verifying TMDB token…");
      try {
        const res = await withTimeout(fetchConfig(val), 10000, null);
        if (!res) {
          apiKeyStatus = "unreachable";
        } else if (res.status === 401 || res.status === 403) {
          apiKeyStatus = "invalid_token";
        }
      } catch {
        apiKeyStatus = "unreachable";
      }
    }

    bootStep("Loading library…", 88, "ui");
    status("Loading library…");
    return complete(val || null, apiKeyStatus);
  } catch {
    return complete(null, "ok");
  }
}
