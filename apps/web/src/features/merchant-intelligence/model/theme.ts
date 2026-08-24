export type ThemeChoice = "light" | "dark";

export const THEME_STORAGE_KEY = "merchant-intelligence-theme";

export const readStoredTheme = (
  storage: Pick<Storage, "getItem"> | undefined,
): ThemeChoice | null => {
  try {
    const saved = storage?.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
};

export const writeStoredTheme = (
  storage: Pick<Storage, "setItem"> | undefined,
  theme: ThemeChoice,
): boolean => {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
};

export const initialTheme = (): ThemeChoice => {
  const requested = new URLSearchParams(window.location.search).get("theme");
  if (requested === "light" || requested === "dark") return requested;
  const saved = readStoredTheme(window.localStorage);
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const applyTheme = (theme: ThemeChoice): void => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#0d0f14" : "#f4f5f7");
};
