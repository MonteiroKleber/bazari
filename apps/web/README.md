# 🌐 Bazari Web - Landing Page & Super App

Landing page institucional e futuro Super App da Bazari.

## 🚀 Desenvolvimento

```bash
# Do diretório raiz do monorepo
pnpm --filter @bazari/web dev

# Ou do diretório apps/web
pnpm dev
```

Acesse http://localhost:5173

## 🎨 Recursos

### Multi-Theme (6 temas)
- **Bazari** - Tema padrão com cores oficiais
- **Night** - Tema escuro
- **Sandstone** - Tema claro papel
- **Emerald** - Tema verde
- **Royal** - Tema roxo/azul
- **Cyber** - Tema neon

### Internacionalização
- 🇧🇷 Português
- 🇺🇸 English
- 🇪🇸 Español

### Componentes
- Header responsivo com navegação
- Hero section com animações
- Cards de módulos
- Roadmap visual
- Theme switcher
- Language switcher
- Footer com links

## 🛠️ Stack

- **React 18** - Framework UI
- **Vite 5** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS 3.4.3** - Estilização
- **shadcn/ui** - Componentes base
- **lucide-react** - Ícones
- **i18next** - Internacionalização

## 📁 Estrutura

```
src/
├── components/       # Componentes React
│   ├── ui/          # Componentes base (shadcn)
│   └── ...          # Componentes da aplicação
├── theme/           # Provider de tema
├── i18n/            # Traduções
├── styles/          # CSS global e temas
├── lib/             # Utilitários
└── App.tsx          # Componente raiz
```

## 🎯 Próximos Passos

1. Integração com wallet
2. Conexão com BazariChain
3. Sistema de autenticação
4. Dashboard do usuário
5. Marketplace MVP