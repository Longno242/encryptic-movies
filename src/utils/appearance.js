/** Theme accent presets — shared by App shell and Settings. */

export const ACCENT_PRESETS = [
  {
    id: "encryptic",
    label: "Encryptic Gold",
    color: "#c4a35a",
    color2: "#e8d5a8",
    dim: "rgba(196, 163, 90, 0.16)",
    glow: "0 0 36px rgba(196, 163, 90, 0.35)",
  },
  {
    id: "silver",
    label: "Silver",
    color: "#a8b4c4",
    color2: "#e2e8f0",
    dim: "rgba(168, 180, 196, 0.14)",
    glow: "0 0 28px rgba(168, 180, 196, 0.25)",
  },
  {
    id: "violet",
    label: "Violet",
    color: "#8b5cf6",
    color2: "#a78bfa",
    dim: "rgba(139, 92, 246, 0.18)",
    glow: "0 0 32px rgba(139, 92, 246, 0.35)",
  },
  {
    id: "red",
    label: "Red",
    color: "#e50914",
    color2: "#ff1a24",
    dim: "rgba(229, 9, 20, 0.15)",
    glow: "0 0 30px rgba(229, 9, 20, 0.3)",
  },
  {
    id: "blue",
    label: "Blue",
    color: "#2563eb",
    color2: "#3b82f6",
    dim: "rgba(37, 99, 235, 0.15)",
    glow: "0 0 30px rgba(37, 99, 235, 0.3)",
  },
  {
    id: "cyan",
    label: "Cyan",
    color: "#06b6d4",
    color2: "#22d3ee",
    dim: "rgba(6, 182, 212, 0.18)",
    glow: "0 0 30px rgba(34, 211, 238, 0.35)",
  },
  {
    id: "emerald",
    label: "Emerald",
    color: "#10b981",
    color2: "#34d399",
    dim: "rgba(16, 185, 129, 0.16)",
    glow: "0 0 28px rgba(52, 211, 153, 0.3)",
  },
  {
    id: "rose",
    label: "Rose",
    color: "#f43f5e",
    color2: "#fb7185",
    dim: "rgba(244, 63, 94, 0.16)",
    glow: "0 0 28px rgba(251, 113, 133, 0.32)",
  },
  {
    id: "amber",
    label: "Amber",
    color: "#f59e0b",
    color2: "#fbbf24",
    dim: "rgba(245, 158, 11, 0.16)",
    glow: "0 0 28px rgba(251, 191, 36, 0.3)",
  },
];

const DEFAULT_PRESET = ACCENT_PRESETS[0];

/** Push accent CSS variables onto `:root`. */
export function applyAccentColor(presetId) {
  const chosen =
    ACCENT_PRESETS.find((p) => p.id === presetId) ?? DEFAULT_PRESET;
  const root = document.documentElement;
  root.style.setProperty("--red", chosen.color);
  root.style.setProperty("--red2", chosen.color2);
  root.style.setProperty("--red-dim", chosen.dim);
  root.style.setProperty("--red-glow", chosen.glow);
}
