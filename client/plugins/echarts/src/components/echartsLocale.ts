import type { registerLocale } from "echarts/core";
export type EChartsLocaleOption = Parameters<typeof registerLocale>[1];

export const LOCALE_LOADERS: Record<
  string,
  () => Promise<{ default: EChartsLocaleOption }>
> = {
  EN: () => import("echarts/i18n/langEN-obj.js"),
  KO: () => import("echarts/i18n/langKO-obj.js"),
};

export const loadLocale = async (
  locale: string,
): Promise<EChartsLocaleOption | undefined> => {
  const loader = LOCALE_LOADERS[locale];
  if (!loader) return undefined;

  try {
    const mod = await loader();
    const localeObj = mod.default ?? (mod as unknown as EChartsLocaleOption);
    if (localeObj?.time) {
      return localeObj;
    }
  } catch {
    throw new Error("locale not found");
  }

  return undefined;
};
