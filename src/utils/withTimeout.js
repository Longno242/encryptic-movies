/**
 * Resolve with the promise result or reject/resolve with fallback after ms.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {T} [fallback]
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, fallback = null) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}
