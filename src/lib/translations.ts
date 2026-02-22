import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';

export type TranslationKeys =
  | 'router_failure'
  | 'generic_refusal'
  | 'specific_fallback'
  | 'specific_error'
  | 'synthesis_failure'
  | 'unrecognized_intent'
  | 'failedProcessSearchResults'
  | 'failedExtractSearchResults';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic resolution to handle both src/ (dev) and dist/ (prod) layouts
const localesDir =
  [
    path.join(__dirname, '../locales'), // src/lib -> src/locales
    path.join(__dirname, '../../locales'), // dist/src/lib -> dist/locales
    path.join(process.cwd(), 'src/locales'), // CWD fallback
    path.join(process.cwd(), 'locales'), // CWD root fallback
  ].find((dir) => fs.existsSync(dir)) || path.join(__dirname, '../locales');

export const DEFAULT_EN_TRANSLATIONS: Record<TranslationKeys, string> = {
  router_failure: 'The AI router could not determine the intent of your query.',
  generic_refusal: "I'm sorry, I specialize only in Movies, Games, Books, and TV Shows.",
  specific_fallback: 'Here is what I found about that:',
  specific_error: 'Failed to retrieve specific entity details.',
  synthesis_failure:
    "I found some information but couldn't generate a summary. Please check the details below.",
  unrecognized_intent:
    "I wasn't sure how to handle that query, but I'm here to help with movies, games, and books.",
  failedProcessSearchResults: 'Failed to process search results',
  failedExtractSearchResults: 'Failed to extract information from search results',
};

export const TranslationSchema = z.object({
  router_failure: z.string(),
  generic_refusal: z.string(),
  specific_fallback: z.string(),
  specific_error: z.string(),
  synthesis_failure: z.string(),
  unrecognized_intent: z.string(),
  failedProcessSearchResults: z.string(),
  failedExtractSearchResults: z.string(),
});

const TRANSLATIONS: Partial<Record<SupportedLanguage, Record<TranslationKeys, string>>> = {};

export function getTranslations(language: string): Record<TranslationKeys, string> {
  const supported: SupportedLanguage[] = ['en', 'es', 'fr', 'de', 'zh', 'ja'];
  const lang = supported.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : 'en';

  if (!TRANSLATIONS[lang]) {
    try {
      const filePath = path.join(localesDir, `${lang}.json`);

      // If file doesn't exist, we fallback to English instead of throwing immediately
      if (!fs.existsSync(filePath)) {
        if (lang === 'en') return DEFAULT_EN_TRANSLATIONS;
        return getTranslations('en');
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      const validation = TranslationSchema.safeParse(parsed);
      if (!validation.success) {
        console.error(`[translations] Validation failed for ${lang}:`, validation.error.message);
        if (lang === 'en') return DEFAULT_EN_TRANSLATIONS;
        return getTranslations('en');
      }

      TRANSLATIONS[lang] = validation.data as Record<TranslationKeys, string>;
    } catch (e) {
      console.error(`[translations] getTranslations failed for ${lang}`, e);
      // Fallback to en if localized file fails or validation fails
      if (lang !== 'en') {
        return getTranslations('en');
      }
      // If 'en' itself fails, return the embedded default
      return DEFAULT_EN_TRANSLATIONS;
    }
  }

  return TRANSLATIONS[lang] || DEFAULT_EN_TRANSLATIONS;
}
