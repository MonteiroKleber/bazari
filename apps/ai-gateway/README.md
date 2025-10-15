# AI Gateway - BazChat OSS AI Microservice

Microserviço de IA para BazChat usando **apenas modelos open-source**.

## 🎯 Objetivos

- **100% Open Source**: Nenhum modelo proprietário ou API externa
- **On-Premise**: Roda localmente ou em servidor próprio
- **Privacy-First**: Dados não saem da infraestrutura
- **Multilingual**: Suporte a tradução, STT, TTS em vários idiomas

## 🤖 Modelos Utilizados

| Funcionalidade | Modelo OSS | Framework |
|----------------|------------|-----------|
| LLM (Chat) | Llama 3 8B Instruct | vLLM |
| Translation | NLLB-200 (600M) | HuggingFace |
| STT | Whisper Large V3 | faster-whisper |
| TTS | XTTS v2 | Coqui-TTS |
| Embeddings | all-MiniLM-L6-v2 | sentence-transformers |

## 🚀 Endpoints

### `/ai/translate` - Tradução
```bash
POST /ai/translate
{
  "text": "Hello world",
  "sourceLang": "en",
  "targetLang": "pt"
}
```

### `/ai/stt` - Speech-to-Text
```bash
POST /ai/stt
Content-Type: multipart/form-data
file: audio.wav
```

### `/ai/tts` - Text-to-Speech
```bash
POST /ai/tts
{
  "text": "Olá, como vai?",
  "language": "pt",
  "speed": 1.0
}
```

### `/ai/complete` - Chat Completion
```bash
POST /ai/complete
{
  "messages": [
    { "role": "user", "content": "Como funciona blockchain?" }
  ],
  "temperature": 0.7,
  "max_tokens": 512
}
```

### `/ai/embed` - Embeddings
```bash
POST /ai/embed
{
  "texts": ["Texto 1", "Texto 2"]
}
```

### `/ai/suggest-reply` - Sugestões de Resposta
```bash
POST /ai/suggest-reply
{
  "conversationHistory": [
    "Olá!",
    "Oi, como vai?",
    "Tudo bem, e você?"
  ]
}
```

## 🛠️ Modo MOCK

Por padrão, o AI Gateway roda em **MOCK MODE** (sem modelos reais).

Para ativar modelos reais:
1. Deploy os modelos usando vLLM, faster-whisper, etc.
2. Configure as URLs no `.env`
3. Defina `AI_MOCK_MODE=false`

## 📦 Instalação

```bash
cd apps/ai-gateway
pnpm install
pnpm dev
```

## 🔧 Configuração

Edite `.env`:
```bash
PORT=3002
AI_MOCK_MODE=false  # Desabilita MOCK

# URLs dos modelos deployados
VLLM_URL=http://seu-servidor:8000
WHISPER_URL=http://seu-servidor:8001
NLLB_URL=http://seu-servidor:8002
TTS_URL=http://seu-servidor:8003
```

## 🐳 Deploy com Docker

Exemplo de `docker-compose.yml` para deploy dos modelos:

```yaml
version: '3.8'
services:
  vllm:
    image: vllm/vllm-openai:latest
    command: --model meta-llama/Meta-Llama-3-8B-Instruct
    ports:
      - "8000:8000"
    volumes:
      - ./models:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  whisper:
    image: onerahmet/openai-whisper-asr-webservice:latest
    ports:
      - "8001:9000"
    environment:
      - ASR_MODEL=large-v3
      - ASR_ENGINE=faster_whisper

  # Adicione NLLB e TTS conforme necessário
```

## 📝 Notas de Desenvolvimento

- Em MOCK mode, os endpoints retornam placeholders
- Use MOCK mode para desenvolvimento sem GPU
- Para produção, deploy os modelos reais
- Considere usar quantização (4-bit) para reduzir VRAM
