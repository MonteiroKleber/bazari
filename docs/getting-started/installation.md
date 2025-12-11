# Instalação do CLI

O CLI do Bazari (`@bazari.libervia.xyz/cli`) é a ferramenta oficial para criar, desenvolver e publicar apps.

## Requisitos

- **Node.js** 18.0 ou superior
- **npm** ou **pnpm**
- Uma conta Bazari (para publicar)

## Instalação Global

### Com npm

```bash
npm install -g @bazari.libervia.xyz/cli
```

### Com pnpm

```bash
pnpm add -g @bazari.libervia.xyz/cli
```

### Com yarn

```bash
yarn global add @bazari.libervia.xyz/cli
```

## Verificar Instalação

```bash
bazari --version
# @bazari.libervia.xyz/cli v0.2.8

bazari --help
# Mostra todos os comandos disponíveis
```

## Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `bazari login` | Autentica com sua conta Bazari |
| `bazari logout` | Desloga da conta |
| `bazari whoami` | Mostra o usuário logado |
| `bazari create <name>` | Cria novo projeto (React+TS ou Vanilla) |
| `bazari dev` | Inicia servidor de desenvolvimento (Vite ou simples) |
| `bazari build` | Compila o app para produção |
| `bazari validate` | Valida o manifest e estrutura |
| `bazari publish` | Publica na App Store |

## Criando um Projeto

```bash
bazari create meu-app
```

O CLI perguntará:

1. **Template:** React + TypeScript (recomendado) ou Vanilla JavaScript
2. **Nome:** Nome do seu app
3. **Descrição:** Descrição curta
4. **Categoria:** Finance, Social, Commerce, Tools, etc.
5. **Autor:** Seu nome ou organização

### Templates Disponíveis

#### React + TypeScript (recomendado)

- Vite como bundler
- React 18
- TypeScript configurado
- Hook `useBazari` incluído (já configurado para API Key)
- Hot Module Replacement (HMR)
- Estrutura organizada com componentes
- Suporte a variáveis de ambiente (`.env.production`)

#### Vanilla JavaScript

- HTML, CSS e JavaScript puro
- Servidor estático simples
- Ideal para apps pequenos
- SDK via CDN (esm.sh)

## Servidor de Desenvolvimento

```bash
cd meu-app
npm install
npm run dev
```

Para projetos React+TS, o CLI detecta automaticamente e usa Vite com HMR:

```
🔧 Bazari Dev Server

App: Meu App
Version: 0.1.0

✓ Hot Module Replacement (HMR) ativo
✓ TypeScript suportado
✓ SDK integrado

📱 Preview no Bazari:
https://bazari.libervia.xyz/app/developer/preview?url=http://localhost:3333
```

## Preview no Bazari

O link de Preview permite testar seu app dentro do ambiente real do Bazari:

1. Execute `npm run dev` no seu projeto
2. Copie o link de Preview mostrado no terminal
3. O app carrega no iframe do Developer Portal
4. Veja os logs do SDK no console lateral

> **Importante:** Algumas funcionalidades do SDK só funcionam quando o app está rodando dentro do Bazari.

## Configuração de API Key

Antes de publicar, configure sua API Key:

1. Obtenha sua API Key em: https://bazari.libervia.xyz/app/developer/api-keys
2. Crie o arquivo `.env.production`:

```bash
# .env.production
VITE_BAZARI_API_KEY=baz_app_xxxxxxxxxxxxxxxx
```

> **Nota:** No Developer Preview, a API Key é opcional. Só é obrigatória para publicação.

## Build para Produção

```bash
npm run build
```

O CLI detecta automaticamente o tipo de projeto:

- **Vite:** Executa `vite build` com TypeScript check
- **Vanilla:** Copia arquivos de `public/` para `dist/`

Saída do build:

```
📦 Building Bazari App

Build Output:

  Directory: /path/to/dist
  Size:      156.24 KB
  Hash:      a1b2c3d4e5f6...
  Version:   0.1.0
  Builder:   Vite

✓ Ready for deployment!
```

## Autenticação

Para publicar apps, você precisa estar autenticado:

```bash
bazari login
```

Isso abrirá seu navegador para autenticar via OAuth. O token é salvo em `~/.bazari/config.json`.

### Verificar Status

```bash
bazari whoami
# Logado como @seuhandle
```

### Logout

```bash
bazari logout
```

## Atualização

Para atualizar para a versão mais recente:

```bash
npm update -g @bazari.libervia.xyz/cli
```

## Troubleshooting

### Erro de permissão no npm global

Se você receber erro de permissão no npm:

```bash
# Opção 1: Usar npx (sem instalação global)
npx @bazari.libervia.xyz/cli create meu-app

# Opção 2: Configurar npm para não usar sudo
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Adicione ~/.npm-global/bin ao seu PATH
```

### CLI não encontrado após instalação

Verifique se o diretório de binários globais do npm está no PATH:

```bash
# npm
npm bin -g

# Adicione ao seu .bashrc ou .zshrc
export PATH="$(npm bin -g):$PATH"
```

### Vite não inicia

Se o Vite não iniciar automaticamente:

```bash
# Verifique se as dependências estão instaladas
npm install

# Ou tente executar diretamente
npx vite --port 3333
```

## Próximos Passos

- [Criar seu primeiro app](./quick-start.md)
- [Conceitos básicos](./concepts.md)
- [Documentação do SDK](../sdk/overview.md)
