import { useTheme } from "@/theme/ThemeProvider";
import { Palette } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  
  return (
    <div className="inline-flex items-center gap-2">
      <Palette className="h-4 w-4 text-muted-foreground" />
      <select
        className="border border-input px-3 py-1 rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
      >
        {themes.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}