export enum ColorSchemeGroup {
  Custom = "custom",
  Featured = "featured",
  Other = "other",
}

export interface ColorSchemeConfig {
  colors: string[];
  description?: string;
  id: string;
  label?: string;
  isDefault?: boolean;
  group?: ColorSchemeGroup;
}

export interface SequentialSchemeConfig extends ColorSchemeConfig {
  isDiverging?: boolean;
}
