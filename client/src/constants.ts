import { BootstrapData, CommonBootstrapData } from "./types";

export enum Actions {
  CREATE = "create",
  UPDATE = "update",
}

export const DEFAULT_COMMON_BOOTSTRAP_DATA: CommonBootstrapData = {
  application_root: "/",
  static_assets_prefix: "",
  conf: {},
  locale: "en",
  feature_flags: {},
  language_pack: {} as CommonBootstrapData["language_pack"],
  extra_categorical_color_schemes: [],
  extra_sequential_color_schemes: [],
  extra_theme_tokens: [],
  theme: {
    default: {},
    dark: {},
  },
  menu_data: {
    menu: [],
    brand: {
      path: "",
      icon: "",
      alt: "",
      tooltip: "",
      text: "",
    },
    navbar_right: {
      show_watermark: true,
      languages: {},
      show_language_picker: true,
      user_is_anonymous: false,
      user_info_url: "",
      user_login_url: "",
      user_logout_url: "",
      locale: "",
    },
    settings: [],
    environment_tag: {
      text: "",
      color: "",
    },
  },
  d3_format: {},
  d3_time_format: {},
  pdf_compression_level: "MEDIUM",
};

export const DEFAULT_BOOTSTRAP_DATA: BootstrapData = {
  common: DEFAULT_COMMON_BOOTSTRAP_DATA,
};
