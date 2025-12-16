# BazChat - Fase 03: Voice Messages, GIFs, Formatting

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

Se houver **qualquer duvida** sobre:
- Como algo deve funcionar
- Qual o comportamento esperado
- Qual API/endpoint usar
- Qual o formato dos dados

**PARE e PERGUNTE** antes de implementar.

---

## Visao Geral

Esta fase adiciona tres funcionalidades ao BazChat:

1. **Voice Messages** - Gravacao e reproducao de mensagens de voz
2. **GIFs** - Integracao com Tenor/Giphy para envio de GIFs
3. **Text Formatting** - Suporte a markdown basico (bold, italic, code, links)

---

## Feature 1: Voice Messages

### 1.1 Requisitos Funcionais

- Botao de microfone no ChatComposer
- Gravacao de audio via MediaRecorder API
- Preview do audio antes de enviar (com waveform visual)
- Limite de duracao: 5 minutos
- Formato: WebM/Opus (fallback para MP3 se necessario)
- Indicador visual durante gravacao (pulsing dot, tempo decorrido)
- Cancelar gravacao com swipe ou botao X
- Player inline nas mensagens com:
  - Play/Pause
  - Progress bar seekable
  - Duracao total
  - Velocidade de reproducao (1x, 1.5x, 2x)

### 1.2 Backend

#### Endpoint de Upload (ja existe: POST /api/chat/upload)
- Aceitar mimetype `audio/webm`, `audio/ogg`, `audio/mpeg`
- Extrair duracao do audio (usar ffprobe ou biblioteca JS)
- Salvar no IPFS com encriptacao

#### Alteracoes no Schema
```prisma
// Nenhuma alteracao necessaria - usar campo existente:
// - type: 'audio'
// - mediaCid: CID do IPFS
// - meta: { duration: number, mimetype: string, size: number }
```

### 1.3 Frontend

#### Novo Componente: VoiceRecorder.tsx
```typescript
interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // default 300 (5 min)
}
```

#### Novo Componente: VoicePlayer.tsx
```typescript
interface VoicePlayerProps {
  src: string; // URL do audio (IPFS gateway)
  duration: number;
  onPlay?: () => void;
  onEnded?: () => void;
}
```

#### Alteracoes no ChatComposer.tsx
- Adicionar botao de microfone (quando nao ha texto)
- Alternar entre modo texto e modo gravacao
- Integrar VoiceRecorder

#### Alteracoes no MessageBubble.tsx
- Detectar `type === 'audio'`
- Renderizar VoicePlayer

### 1.4 Fluxo de Gravacao

1. Usuario clica no microfone
2. Solicitar permissao do navegador (navigator.mediaDevices.getUserMedia)
3. Iniciar gravacao com MediaRecorder
4. Mostrar UI de gravacao (tempo, waveform, botao parar)
5. Ao parar:
   - Gerar Blob do audio
   - Mostrar preview com VoicePlayer
   - Opcoes: Enviar ou Descartar
6. Ao enviar:
   - Upload via /api/chat/upload
   - Enviar mensagem com type='audio'

---

## Feature 2: GIFs (Tenor Integration)

### 2.1 Requisitos Funcionais

- Botao de GIF no ChatComposer
- Picker modal com:
  - Campo de busca
  - GIFs em tendencia (default)
  - Grid de resultados
  - Infinite scroll
- Enviar GIF como mensagem de imagem
- Preview do GIF antes de enviar

### 2.2 Backend

#### Novo Endpoint: GET /api/chat/gifs
```typescript
// Query params:
// - q: string (termo de busca, opcional)
// - pos: string (posicao para paginacao)
// - limit: number (default 20)

// Response:
{
  gifs: Array<{
    id: string;
    title: string;
    preview: string;   // URL do preview (menor)
    url: string;       // URL do GIF full
    width: number;
    height: number;
  }>;
  next: string; // posicao para proxima pagina
}
```

#### Configuracao Tenor API
- Obter API key em: https://developers.google.com/tenor/guides/quickstart
- Adicionar env: `TENOR_API_KEY`
- Endpoint Tenor: `https://tenor.googleapis.com/v2/search`

### 2.3 Frontend

#### Novo Componente: GifPicker.tsx
```typescript
interface GifPickerProps {
  onSelect: (gif: { url: string; width: number; height: number }) => void;
  onClose: () => void;
}
```

#### Alteracoes no ChatComposer.tsx
- Adicionar botao de GIF no menu [+]
- Abrir GifPicker como modal/popover
- Ao selecionar, enviar como mensagem de imagem

### 2.4 Fluxo de Envio de GIF

1. Usuario clica no botao GIF
2. Abre GifPicker com trending GIFs
3. Usuario pode buscar ou selecionar
4. Ao selecionar:
   - Download do GIF
   - Upload para IPFS (sem encriptacao - GIFs sao publicos)
   - Enviar mensagem com type='image', mediaCid, meta.isGif=true

---

## Feature 3: Text Formatting (Markdown)

### 3.1 Requisitos Funcionais

Suporte a formatacao basica:
- **Bold**: `**texto**` ou `__texto__`
- *Italic*: `*texto*` ou `_texto_`
- `Code inline`: `` `codigo` ``
- ~~Strikethrough~~: `~~texto~~`
- Links: `[texto](url)` (auto-detect URLs tambem)
- Quebra de linha: Shift+Enter

### 3.2 Backend

- Nenhuma alteracao necessaria
- Markdown e processado no frontend

### 3.3 Frontend

#### Novo Componente: FormattedText.tsx
```typescript
interface FormattedTextProps {
  text: string;
  className?: string;
}

// Usa regex ou biblioteca (marked, remark) para parsear
// Renderiza com elementos HTML apropriados
// Links abrem em nova aba com rel="noopener noreferrer"
```

#### Alteracoes no MessageBubble.tsx
- Usar FormattedText para renderizar mensagens de texto
- Preservar compatibilidade com mensagens antigas (plaintext)

#### Alteracoes no ChatComposer.tsx
- Shift+Enter para quebra de linha
- Enter para enviar
- Toolbar opcional com botoes de formatacao (mobile-friendly)

### 3.4 Toolbar de Formatacao (Opcional)

Toolbar acima do input com botoes:
- B (bold)
- I (italic)
- S (strikethrough)
- </> (code)
- Link icon

Ao clicar, insere os marcadores no texto selecionado ou na posicao do cursor.

---

## Arquivos a Criar/Modificar

### Novos Arquivos

```
apps/web/src/components/chat/
├── VoiceRecorder.tsx      # Gravador de audio
├── VoicePlayer.tsx        # Player de audio
├── GifPicker.tsx          # Seletor de GIFs
└── FormattedText.tsx      # Renderizador de markdown

apps/api/src/chat/routes/
└── chat.gifs.ts           # Endpoint proxy Tenor
```

### Arquivos a Modificar

```
apps/web/src/components/chat/
├── ChatComposer.tsx       # Adicionar botoes voice/gif
└── MessageBubble.tsx      # Renderizar audio/gifs/formatted text

apps/api/src/server.ts     # Registrar rota de gifs
```

---

## Dependencias

### Frontend
```bash
# Ja instaladas - nenhuma nova necessaria
# MediaRecorder API e nativo do browser
```

### Backend
```bash
# Para duracao de audio (opcional - pode calcular no frontend)
pnpm add --filter @bazari/api music-metadata
```

### Variaveis de Ambiente
```env
# Adicionar ao .env
TENOR_API_KEY=your_tenor_api_key_here
```

---

## Ordem de Implementacao Sugerida

1. **Text Formatting** (mais simples, sem dependencias externas)
   - FormattedText.tsx
   - Integrar no MessageBubble
   - Testar

2. **Voice Messages** (requer permissoes do browser)
   - VoiceRecorder.tsx
   - VoicePlayer.tsx
   - Integrar no ChatComposer
   - Integrar no MessageBubble
   - Testar gravacao e reproducao

3. **GIFs** (requer API key externa)
   - Configurar TENOR_API_KEY
   - Criar endpoint /api/chat/gifs
   - GifPicker.tsx
   - Integrar no ChatComposer
   - Testar busca e envio

---

## Consideracoes de UX

### Voice Messages
- Solicitar permissao de microfone apenas quando usuario clicar
- Mostrar estado claro de "gravando" vs "pausado"
- Feedback haptico em mobile (se disponivel)
- Waveform visual durante gravacao

### GIFs
- Loading skeleton enquanto carrega
- Lazy loading das imagens
- Tamanho maximo do grid: 3 colunas mobile, 4 desktop
- Preview estatico, anima ao hover

### Formatting
- Preview em tempo real (opcional)
- Nao quebrar emojis
- Escapar HTML para seguranca (XSS)
- Links clicaveis mas seguros

---

## Testes Manuais

### Voice Messages
- [ ] Gravar audio de 10 segundos
- [ ] Cancelar gravacao
- [ ] Reproduzir audio enviado
- [ ] Seek no player
- [ ] Mudar velocidade de reproducao
- [ ] Audio em grupo
- [ ] Audio em DM (verificar E2EE dos metadados)

### GIFs
- [ ] Buscar GIF por termo
- [ ] Ver trending
- [ ] Scroll infinito
- [ ] Enviar GIF
- [ ] GIF aparece corretamente na conversa

### Formatting
- [ ] Texto bold
- [ ] Texto italic
- [ ] Texto code
- [ ] Link clicavel
- [ ] URL auto-detectada
- [ ] Combinacao de formatos
- [ ] Mensagem sem formatacao (compatibilidade)

---

## Estimativa de Complexidade

| Feature | Complexidade | Arquivos | Dependencias |
|---------|--------------|----------|--------------|
| Text Formatting | Baixa | 2-3 | Nenhuma |
| Voice Messages | Media | 4-5 | Browser APIs |
| GIFs | Media | 3-4 | Tenor API |

---

## Referencias

- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Tenor API Docs](https://developers.google.com/tenor/guides/quickstart)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
