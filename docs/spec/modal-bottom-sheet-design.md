# OPÇÃO 2: Bottom Sheet Pattern - Design Visual

## 📱 MOBILE (< 768px)

```
┌─────────────────────────────────────┐
│                                     │
│         CONTEÚDO DA PÁGINA          │
│         (Feed de Posts)             │
│                                     │
│                                     │
├─────────────────────────────────────┤ ← Overlay escurecido (bg-black/40)
│ ═══════════════════════════════════ │ ← Drag handle (indicador visual)
│                                     │
│  📝 Criar Post              ✕       │ ← Header fixo (não scrolla)
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │ O que você está pensando?     │ │ ← Textarea (4 rows mobile)
│  │                               │ │
│  │                               │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌─────────┬─────────┐             │ ← Preview de imagens
│  │  📷     │  📷     │             │   (grid 2x2, compacto)
│  │  img 1  │  img 2  │             │
│  └─────────┴─────────┘             │
│  ┌─────────┬─────────┐             │
│  │  📷     │  📷     │             │
│  │  img 3  │  img 4  │             │
│  └─────────┴─────────┘             │
│                                     │  ← ÁREA SCROLLABLE
│  ╔═══════════════════════════════╗ │    (overflow-y-auto)
│  ║ 📊 Enquete                  ✕ ║ │
│  ╠═══════════════════════════════╣ │
│  ║ Opção 1: [____________]       ║ │
│  ║ Opção 2: [____________]       ║ │
│  ║ Opção 3: [____________]       ║ │
│  ║                               ║ │
│  ║ + Adicionar opção             ║ │
│  ║                               ║ │
│  ║ Duração: [▼ 1 dia]            ║ │
│  ╚═══════════════════════════════╝ │
│                                     │
│  ↓ Scroll para ver mais ↓          │
│                                     │
├─────────────────────────────────────┤
│ 🖼️ 🎬 📊 😊 @  │ 234/5000 [Publicar]│ ← Footer fixo (sempre visível)
└─────────────────────────────────────┘
    ↑
    90vh altura (ocupa quase tela toda)
    Desliza de baixo pra cima
    Gesture: arrastar pra baixo fecha
```

### Características Mobile:
- **Altura**: 90vh (ocupa 90% da tela)
- **Animação**: Slide up from bottom (desliza de baixo pra cima)
- **Gesture**: Arrastar o drag handle ou swipe down para fechar
- **Bordas**: Cantos arredondados apenas no topo (`rounded-t-[10px]`)
- **Header**: Fixo com título + botão fechar
- **Footer**: Fixo com toolbar + botão publicar (sempre visível)
- **Content**: Scrollable entre header e footer

---

## 🖥️ DESKTOP (≥ 768px)

```
           Tela completa do navegador
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         CONTEÚDO DA PÁGINA (Feed)                          │
│                                                             │
│      ┌─────────────────────────────────────┐               │
│      │ ╔═══════════════════════════════╗  │               │ ← Overlay (bg-background/80 backdrop-blur)
│      │ ║                             ✕ ║  │               │
│      │ ║  📝 Criar Post                ║  │               │ ← Modal centralizado
│      │ ╠═══════════════════════════════╣  │               │   (max-w-2xl ~ 672px)
│      │ ║                               ║  │               │
│      │ ║ ┌───────────────────────────┐ ║  │               │
│      │ ║ │ O que você está pensando? │ ║  │               │ ← Textarea (6 rows)
│      │ ║ │                           │ ║  │               │
│      │ ║ │                           │ ║  │               │
│      │ ║ │                           │ ║  │               │
│      │ ║ │                           │ ║  │               │
│      │ ║ └───────────────────────────┘ ║  │               │
│      │ ║                               ║  │               │
│      │ ║ ┌──────────┬──────────┐       ║  │               │
│      │ ║ │   📷     │   📷     │       ║  │               │ ← Preview imagens
│      │ ║ │  img 1   │  img 2   │       ║  │               │   (h-32 ~ 128px)
│      │ ║ └──────────┴──────────┘       ║  │               │
│      │ ║ ┌──────────┬──────────┐       ║  │  ÁREA         │
│      │ ║ │   📷     │   📷     │       ║  │  SCROLLABLE   │
│      │ ║ │  img 3   │  img 4   │       ║  │  (se exceder  │
│      │ ║ └──────────┴──────────┘       ║  │  viewport)    │
│      │ ║                               ║  │               │
│      │ ║ ╔═══════════════════════════╗ ║  │               │
│      │ ║ ║ 📊 Enquete              ✕ ║ ║  │               │
│      │ ║ ╠═══════════════════════════╣ ║  │               │
│      │ ║ ║ Opção 1: [______________] ║ ║  │               │
│      │ ║ ║ Opção 2: [______________] ║ ║  │               │
│      │ ║ ║ Opção 3: [______________] ║ ║  │               │
│      │ ║ ║ + Adicionar opção         ║ ║  │               │
│      │ ║ ║ Duração: [▼ 1 dia]        ║ ║  │               │
│      │ ║ ╚═══════════════════════════╝ ║  │               │
│      │ ║                               ║  │               │
│      │ ╠═══════════════════════════════╣  │               │
│      │ ║ 🖼️ 🎬 📊 😊 @     234/5000   ║  │               │ ← Footer
│      │ ║                    [Publicar] ║  │               │   (sempre visível)
│      │ ╚═══════════════════════════════╝  │               │
│      └─────────────────────────────────────┘               │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           ↑
      Centralizado (translate-x-[-50%] translate-y-[-50%])
      Cantos arredondados (rounded-lg)
      Sombra (shadow-lg)
```

### Características Desktop:
- **Largura**: max-w-2xl (672px)
- **Posição**: Centralizado na tela
- **Animação**: Zoom in + fade in (padrão Radix Dialog)
- **Bordas**: Todos os cantos arredondados (`rounded-lg`)
- **Comportamento**: Modal tradicional (ESC fecha, click overlay fecha)
- **Max-height**: max-h-[90vh] com scroll interno se necessário

---

## 🎨 Diferenças Visuais Entre Mobile e Desktop

| Aspecto | Mobile (Bottom Sheet) | Desktop (Modal) |
|---------|----------------------|-----------------|
| **Posição** | Bottom (fixo embaixo) | Center (centralizado) |
| **Altura** | 90vh (quase tela toda) | Auto (até max-h-90vh) |
| **Largura** | 100% da tela | 672px (max-w-2xl) |
| **Cantos arredondados** | Apenas topo | Todos os lados |
| **Drag handle** | ✅ Sim (═══ no topo) | ❌ Não |
| **Animação entrada** | Slide up (de baixo) | Zoom in + fade |
| **Fechar gesture** | Swipe down | Click overlay / ESC |
| **Textarea rows** | 4 rows | 6 rows |
| **Preview altura** | h-20 (80px) | h-32 (128px) |
| **Espaçamento** | Compacto (space-y-3) | Normal (space-y-4) |

---

## 📦 Bibliotecas Necessárias

### Opção A: Vaul (Recomendada - mais leve)
```bash
pnpm add vaul
```

**Prós:**
- Específica para Bottom Sheet
- Muito leve (~3kb)
- Gestures nativos
- Acessibilidade built-in

### Opção B: Radix Sheet + Custom
```bash
# Já temos Radix Dialog instalado
# Criar variant "sheet" customizada
```

**Prós:**
- Mesma API do Dialog atual
- Sem dependência extra
- Mais controle

---

## 🎯 Exemplo de Código (Conceitual)

```tsx
// Usar Vaul para mobile, Dialog para desktop
import { useMediaQuery } from '@/hooks/use-media-query';
import { Drawer } from 'vaul';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const content = (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Criar Post</h2>
      </div>

      {/* Content scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <Textarea rows={isMobile ? 4 : 6} />
        {/* Preview de imagens, vídeos, enquete... */}
      </div>

      {/* Footer fixo */}
      <div className="flex-shrink-0 px-4 py-3 border-t">
        <div className="flex items-center justify-between">
          {/* Toolbar + Botão Publicar */}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 h-[90vh] bg-background rounded-t-[10px] flex flex-col">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mt-4" />
            {content}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        {content}
      </DialogContent>
    </Dialog>
  );
}
```

---

## ✅ Vantagens Visuais da OPÇÃO 2

1. **Mobile**: Experiência igual a apps nativos (Instagram, Twitter, WhatsApp)
2. **Gesture natural**: Arrastar pra baixo para fechar é intuitivo
3. **Aproveitamento máximo do espaço**: 90vh em mobile
4. **Botão sempre visível**: Footer fixo garante acesso ao "Publicar"
5. **Transição suave**: Animação de deslizar é mais agradável que fade
6. **Familiaridade**: Usuários já conhecem esse padrão

---

## ⚠️ Considerações de Implementação

- Precisa adicionar `vaul` ou implementar bottom sheet custom
- Lógica de detecção mobile/desktop (useMediaQuery)
- Testar gestures em diferentes dispositivos
- Garantir acessibilidade (ARIA labels, focus trap)
- Testar com teclado virtual aberto (keyboard overlay)

---

**Gostou dessa visualização? Quer que eu implemente a OPÇÃO 2 ou prefere ver o design de outra opção?**
