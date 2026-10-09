import en from '../../locales/en.json';
import es from '../../locales/es.json';

export type SupportedLocale = 'en' | 'es';

type NestedTranslations = { [key: string]: string | NestedTranslations };

const translations: Record<SupportedLocale, NestedTranslations> = {
  en: en as NestedTranslations,
  es: es as NestedTranslations,
};

let currentLocale: SupportedLocale = 'en';

export function setLocale(locale: SupportedLocale) {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>, localeOverride?: SupportedLocale): string {
  const activeLocale = localeOverride || currentLocale;
  const dict = translations[activeLocale] || translations.en;
  const keys = key.split('.');
  
  let current: any = dict;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      // Fallback to English
      let fallbackCurrent: any = translations.en;
      for (const fk of keys) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fk in fallbackCurrent) {
          fallbackCurrent = fallbackCurrent[fk];
        } else {
          return key;
        }
      }
      current = fallbackCurrent;
      break;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  let result = current;
  if (params) {
    Object.entries(params).forEach(([paramKey, val]) => {
      result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(val));
    });
  }

  return result;
}

export function formatCurrency(amount: number, symbol: string = '$'): string {
  const formatted = new Intl.NumberFormat(currentLocale === 'es' ? 'es-AR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol} ${formatted}`;
}

export function formatPercent(variation: number): string {
  const prefix = variation > 0 ? '+' : '';
  return `${prefix}${variation.toFixed(1)}%`;
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(currentLocale === 'es' ? 'es-AR' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export { en, es };
