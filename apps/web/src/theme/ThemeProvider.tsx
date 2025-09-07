import { createContext, useContext, useEffect, useState } from "react";

type ThemeId = "bazari" | "night" | "sandstone" | "emerald" | "royal" | "cyber";
const THEME_KEY = "bazari:theme";

const ThemeContext = createContext<{
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  themes: { id: ThemeId; name: string }[];
} | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode, defaultTheme?: ThemeId }> = ({
  children,
  defaultTheme = "bazari",
}) => {
  const [theme, setTheme] = useState<ThemeId>(defaultTheme);
  const themes = [
    { id: "bazari" as ThemeId, name: "Bazari (vinho)" },
    { id: "night" as ThemeId, name: "Night (escuro)" },
    { id: "sandstone" as ThemeId, name: "Sandstone (claro)" },
    { id: "emerald" as ThemeId, name: "Emerald (verde)" },
    { id: "royal" as ThemeId, name: "Royal (roxo/azul)" },
    { id: "cyber" as ThemeId, name: "Cyber (neon)" },
  ] as const;

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as ThemeId) || defaultTheme;
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, [defaultTheme]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};