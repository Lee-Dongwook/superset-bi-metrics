import Translator from "./Translator";
import type { TranslatorConfig, Translations, LocaleData } from "./types";

let singleton: Translator | undefined;
let isConfigured: boolean = false;

const warnedPreConfigureKeys = new Set<string>();

function configure(config: TranslatorConfig) {
  singleton = new Translator(config);
  isConfigured = true;

  return singleton;
}

declare global {
  interface Window {
    __BIMETRICS_LANGUAGE_PACK__?: TranslatorConfig["languagePack"];
  }
}

function autoConfigureFromWindow() {
  if (isConfigured) return;
  if (typeof window === "undefined") return;
  const pack = window.__BIMETRICS_LANGUAGE_PACK__;
  if (pack) {
    configure({ languagePack: pack });
  }
}

function getInstance() {
  autoConfigureFromWindow();
  if (typeof singleton === "undefined") {
    singleton = new Translator();
  }
  return singleton;
}

function warnPreConfigure(fn: "t" | "tn", key: string) {
  if (
    typeof process !== "undefined" &&
    process.env?.NODE_ENV === "production"
  ) {
    return;
  }

  if (warnedPreConfigureKeys.has(key)) return;
  warnedPreConfigureKeys.add(key);
}

function resetTranslation() {
  if (isConfigured) {
    isConfigured = false;
    singleton = undefined;
  }
  warnedPreConfigureKeys.clear();
}

function addTranslation(key: string, translations: string[]) {
  return getInstance().addTranslation(key, translations);
}

function addTranslations(translations: Translations) {
  return getInstance().addTranslations(translations);
}

function addLocaleData(data: LocaleData) {
  return getInstance().addLocaleData(data);
}

function t(input: string, ...args: unknown[]) {
  autoConfigureFromWindow();
  if (!isConfigured) warnPreConfigure("t", input);
  return getInstance().translate(input, ...args);
}

function tn(key: string, ...args: unknown[]) {
  autoConfigureFromWindow();
  if (!isConfigured) warnPreConfigure("tn", key);
  return getInstance().translateWithNumber(key, ...args);
}

export {
  configure,
  addTranslation,
  addTranslations,
  addLocaleData,
  t,
  tn,
  resetTranslation,
};
