import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import './Translator.css';

const LANGUAGES = [
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'zh-TW', label: '中文 (繁體)' },
  { code: 'zh-SG', label: '华语 (新加坡)' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];

const TranslationContext = createContext({ lang: null, translate: async (text) => text });

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState(null);
  const cacheRef = useRef({});

  const translate = useCallback(async (text) => {
    if (!lang || !text) return text;
    const cacheKey = `${lang}:${text}`;
    if (cacheRef.current[cacheKey]) return cacheRef.current[cacheKey];

    const apiKey = process.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY;
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: lang, format: 'html' }),
      }
    );
    const data = await res.json();
    const translated = data.data.translations[0].translatedText;
    cacheRef.current[cacheKey] = translated;
    return translated;
  }, [lang]);

  return (
    <TranslationContext.Provider value={{ lang, setLang, translate }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}

export function T({ children }) {
  const { translate } = useContext(TranslationContext);
  const [text, setText] = useState(children);

  useEffect(() => {
    if (typeof children === 'string') {
      translate(children).then(setText);
    }
  }, [children, translate]);

  return <>{text}</>;
}

function Translator() {
  const { lang, setLang } = useContext(TranslationContext);

  return (
    <div className="translator">
      <select
        value={lang || ''}
        onChange={e => setLang(e.target.value || null)}
        aria-label="Select language"
      >
        <option value="">🌐 Translate</option>
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}

export default Translator;
