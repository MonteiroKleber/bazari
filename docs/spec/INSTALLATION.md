# 📦 Guia de Instalação - Bazari Monorepo

## Estrutura de Diretórios

Crie a seguinte estrutura de pastas:

```
bazari/
├── apps/
│   └── web/
│       ├── public/
│       └── src/
│           ├── components/
│           │   └── ui/
│           ├── i18n/
│           ├── lib/
│           ├── styles/
│           └── theme/
└── packages/
```

## Passo a Passo

### 1. Criar a estrutura base

```bash
# Criar diretório raiz
mkdir bazari
cd bazari

# Criar estrutura de pastas
mkdir -p apps/web/src/{components/ui,i18n,lib,styles,theme}
mkdir -p apps/web/public
mkdir -p packages
```

### 2. Copiar arquivos da raiz

Coloque na raiz do projeto (`bazari/`):
- `package.json`
- `pnpm-workspace.yaml`
- `.gitignore`
- `.editorconfig`
- `.nvmrc`
- `README.md`
- `setup.sh` (opcional)

### 3. Copiar arquivos do apps/web

Em `apps/web/`:
- `package.json`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `tailwind.config.js`
- `postcss.config.js`
- `README.md`

### 4. Copiar arquivos fonte

Em `apps/web/src/`:

**Raiz do src:**
- `main.tsx`
- `App.tsx`
- `vite-env.d.ts`

**styles/:**
- `index.css`

**lib/:**
- `utils.ts`

**theme/:**
- `ThemeProvider.tsx`

**i18n/:**
- `index.ts`
- `pt.json`
- `en.json`
- `es.json`

**components/:**
- `Header.tsx`
- `Hero.tsx`
- `Features.tsx`
- `Roadmap.tsx`
- `CTASection.tsx`
- `Footer.tsx`
- `ThemeSwitcher.tsx`
- `LanguageSwitcher.tsx`
- `ThemeGallery.tsx`

**components/ui/:**
- `button.tsx`

### 5. Instalar e rodar

```bash
# Na raiz do projeto (bazari/)

# Instalar PNPM se necessário
npm install -g pnpm

# Instalar dependências
pnpm install

# Rodar o projeto
pnpm --filter @bazari/web dev

# Ou simplesmente
pnpm dev
```

### 6. Acessar o projeto

Abra o navegador em: **http://localhost:5173**

## 🎯 Verificação

Após a instalação, você deve ver:
- Landing page com tema Bazari (vinho/dourado)
- Seletor de idiomas (PT/EN/ES) funcionando
- Seletor de temas (6 opções) funcionando
- Menu responsivo
- Animações no Hero section
- Cards dos módulos
- Roadmap visual
- Galeria de temas

## 🔧 Troubleshooting

### Erro de dependências
```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Porta 5173 em uso
```bash
# Usar outra porta
pnpm --filter @bazari/web dev -- --port 3000
```

### Erro de TypeScript
```bash
# Verificar versão do Node
node --version  # Deve ser 18+

# Reinstalar TypeScript
pnpm add -D typescript@latest
```

## ✅ Checklist Final

- [ ] Node.js 18+ instalado
- [ ] PNPM 8+ instalado
- [ ] Todos os arquivos copiados corretamente
- [ ] `pnpm install` executado sem erros
- [ ] Projeto rodando em http://localhost:5173
- [ ] Temas funcionando
- [ ] Traduções funcionando
- [ ] Layout responsivo
- [ ] Sem menções a IPFS

## 🎉 Pronto!

O monorepo Bazari está configurado e rodando. A landing page está pronta com:
- Sistema multi-theme (6 temas)
- Internacionalização (PT/EN/ES)
- Design responsivo
- Identidade visual Bazari
- Arquitetura escalável

Para desenvolvimento futuro, adicione novos packages em `packages/` e novos apps em `apps/`.