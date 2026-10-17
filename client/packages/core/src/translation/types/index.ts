import { Jed as BaseJed, JedOptions, DomainData, Translations } from "./jed";
export type { Translations, DomainConfig, DomainData, JedOptions } from "./jed";

export type Locale = "en" | "ko";

export type LanguagePack = JedOptions & {
  locale_data: {
    bimetrics: DomainData & {
      "": {
        domain: "bimetrics";
        lang: Locale;
        plural_forms: string;
      };
    };
  };
};

export interface Jed extends BaseJed {
  options: LanguagePack;
}

export interface TranslatorConfig {
  languagePack?: LanguagePack;
}

export type LocaleData = Partial<Record<Locale, Translations>>;
