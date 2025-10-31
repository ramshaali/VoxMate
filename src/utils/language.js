export function getLanguageFullName(code) {
  const map = {
    en: "English",
    zh: "Simplified Chinese",
    es: "Spanish",
    fr: "French",
    hi: "Hindi",
    ur: "Urdu",
    de: "German",
    ar: "Arabic",
    ja: "Japanese",
    ko: "Korean",
    ru: "Russian",
    it: "Italian",
    pt: "Portuguese",
  };
  return map[code] || "English"; // default
}
