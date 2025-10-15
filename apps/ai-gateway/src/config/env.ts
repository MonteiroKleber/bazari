import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3002'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // AI Model Endpoints (OSS only)
  VLLM_URL: z.string().default('http://localhost:8000'), // Llama 3 via vLLM
  WHISPER_URL: z.string().default('http://localhost:8001'), // Whisper STT
  NLLB_URL: z.string().default('http://localhost:8002'), // NLLB translation
  TTS_URL: z.string().default('http://localhost:8003'), // Coqui-TTS

  // Vector Database
  VECDB_URL: z.string().default('http://localhost:6333'), // Qdrant
  VECDB_COLLECTION: z.string().default('bazchat_messages'),

  // Feature Flags (enable MOCK mode if models not available)
  AI_MOCK_MODE: z.string().transform(val => val === 'true').default('true'),
});

export const env = envSchema.parse(process.env);

export const AI_CONFIG = {
  models: {
    llm: 'meta-llama/Meta-Llama-3-8B-Instruct',
    embed: 'sentence-transformers/all-MiniLM-L6-v2',
    whisper: 'openai/whisper-large-v3',
    nllb: 'facebook/nllb-200-distilled-600M',
    tts: 'tts_models/multilingual/multi-dataset/xtts_v2',
  },
  endpoints: {
    vllm: env.VLLM_URL,
    whisper: env.WHISPER_URL,
    nllb: env.NLLB_URL,
    tts: env.TTS_URL,
    vecdb: env.VECDB_URL,
  },
  mockMode: env.AI_MOCK_MODE,
};
