import { AI_CONFIG } from '../config/env.js';

/**
 * Cliente para NLLB (No Language Left Behind - Tradução)
 */

interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

interface TranslationResponse {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  model: string;
}

// Mapa de códigos de idioma (ISO 639-1 → NLLB)
const LANG_MAP: Record<string, string> = {
  en: 'eng_Latn',
  pt: 'por_Latn',
  es: 'spa_Latn',
  fr: 'fra_Latn',
  de: 'deu_Latn',
  it: 'ita_Latn',
  zh: 'zho_Hans',
  ja: 'jpn_Jpan',
  ko: 'kor_Hang',
  ar: 'arb_Arab',
  ru: 'rus_Cyrl',
};

export class NLLBClient {
  private baseUrl: string;
  private mockMode: boolean;

  constructor() {
    this.baseUrl = AI_CONFIG.endpoints.nllb;
    this.mockMode = AI_CONFIG.mockMode;
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    if (this.mockMode) {
      return this.mockTranslate(request);
    }

    try {
      const sourceLangCode = LANG_MAP[request.sourceLang] || request.sourceLang;
      const targetLangCode = LANG_MAP[request.targetLang] || request.targetLang;

      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          source_lang: sourceLangCode,
          target_lang: targetLangCode,
          model: AI_CONFIG.models.nllb,
        }),
      });

      if (!response.ok) {
        throw new Error(`NLLB error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { translated_text: string };

      return {
        translatedText: data.translated_text,
        sourceLang: request.sourceLang,
        targetLang: request.targetLang,
        model: AI_CONFIG.models.nllb,
      };
    } catch (error) {
      console.error('NLLB client error, falling back to MOCK:', error);
      return this.mockTranslate(request);
    }
  }

  private async mockTranslate(request: TranslationRequest): Promise<TranslationResponse> {
    // Primeira tentativa: MyMemory Translation API (gratuito, sem API key!)
    try {
      console.log('[NLLB Mock] Using MyMemory Translation API (free)...');

      const langPair = `${request.sourceLang}|${request.targetLang}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(request.text)}&langpair=${langPair}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = (await response.json()) as {
          responseData: { translatedText: string };
          responseStatus: number;
        };

        if (data.responseStatus === 200) {
          console.log('[NLLB Mock] ✅ MyMemory translation successful!');

          return {
            translatedText: data.responseData.translatedText,
            sourceLang: request.sourceLang,
            targetLang: request.targetLang,
            model: 'mymemory-free',
          };
        }
      }

      console.warn('[NLLB Mock] MyMemory failed, trying LibreTranslate...');
    } catch (error) {
      console.error('[NLLB Mock] MyMemory error:', error);
    }

    // Segunda tentativa: LibreTranslate (requer API key desde 2024)
    // Se você tiver uma API key, configure em AI_CONFIG
    const libreTranslateApiKey = process.env.LIBRETRANSLATE_API_KEY;

    if (libreTranslateApiKey) {
      try {
        console.log('[NLLB Mock] Trying LibreTranslate with API key...');

        const response = await fetch('https://libretranslate.com/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: request.text,
            source: request.sourceLang,
            target: request.targetLang,
            format: 'text',
            api_key: libreTranslateApiKey,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as { translatedText: string };
          console.log('[NLLB Mock] ✅ LibreTranslate success!');

          return {
            translatedText: data.translatedText,
            sourceLang: request.sourceLang,
            targetLang: request.targetLang,
            model: 'libretranslate',
          };
        }
      } catch (error) {
        console.error('[NLLB Mock] LibreTranslate error:', error);
      }
    }

    // Último fallback: mock simples
    const mockTranslations: Record<string, Record<string, string>> = {
      'Olá': { en: 'Hello', es: 'Hola', fr: 'Bonjour' },
      'Bom dia': { en: 'Good morning', es: 'Buenos días', fr: 'Bonjour' },
      'Como você está?': { en: 'How are you?', es: '¿Cómo estás?', fr: 'Comment allez-vous?' },
      'Obrigado': { en: 'Thank you', es: 'Gracias', fr: 'Merci' },
    };

    let translatedText = mockTranslations[request.text]?.[request.targetLang];

    if (!translatedText) {
      const targetPrefix: Record<string, string> = {
        en: '[EN]',
        pt: '[PT]',
        es: '[ES]',
        fr: '[FR]',
        de: '[DE]',
      };
      translatedText = `${targetPrefix[request.targetLang] || '[LANG]'} ${request.text}`;
    }

    console.log('[NLLB Mock] Using simple mock fallback');

    return {
      translatedText,
      sourceLang: request.sourceLang,
      targetLang: request.targetLang,
      model: 'mock-simple',
    };
  }
}

export const nllbClient = new NLLBClient();
