import { useTheme } from "@/theme/ThemeProvider";

export function ThemeGallery() {
  const { themes, setTheme, theme: currentTheme } = useTheme();
  
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {themes.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id as any)}
          className={`rounded-2xl border-2 p-4 text-left transition hover:scale-[1.01] ${
            currentTheme === t.id ? 'border-primary' : 'border-border'
          }`}
        >
          <div className="text-sm text-muted-foreground mb-2">Tema</div>
          <div className="text-lg font-semibold mb-3">{t.name}</div>
          <div className="grid grid-cols-6 gap-2">
            <div 
              className="h-6 rounded border"
              style={{ 
                backgroundColor: `hsl(${t.id === 'bazari' ? '40 20% 96%' : 
                  t.id === 'night' ? '0 0% 8%' :
                  t.id === 'sandstone' ? '45 33% 96%' :
                  t.id === 'emerald' ? '150 30% 97%' :
                  t.id === 'royal' ? '245 60% 97%' :
                  '230 25% 8%'})` 
              }}
            />
            <div 
              className="h-6 rounded"
              style={{ 
                backgroundColor: `hsl(${t.id === 'bazari' ? '0 100% 27%' : 
                  t.id === 'night' ? '0 80% 45%' :
                  t.id === 'sandstone' ? '45 100% 45%' :
                  t.id === 'emerald' ? '160 85% 35%' :
                  t.id === 'royal' ? '258 80% 50%' :
                  '170 95% 55%'})` 
              }}
            />
            <div 
              className="h-6 rounded"
              style={{ 
                backgroundColor: `hsl(${t.id === 'bazari' ? '45 100% 54%' : 
                  t.id === 'night' ? '45 100% 54%' :
                  t.id === 'sandstone' ? '12 80% 52%' :
                  t.id === 'emerald' ? '45 100% 54%' :
                  t.id === 'royal' ? '210 90% 50%' :
                  '318 95% 55%'})` 
              }}
            />
            <div className="h-6 rounded bg-card border" />
            <div className="h-6 rounded bg-accent" />
            <div className="h-6 rounded bg-muted" />
          </div>
        </button>
      ))}
    </div>
  );
}