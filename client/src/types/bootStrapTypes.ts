import { TimeLocaleDefinition } from "d3-time-format";
import { FormatLocaleDefinition } from "d3-format";
import type {
  JsonObject,
  FeatureFlagMap,
  ColorSchemeConfig,
  SequentialSchemeConfig,
} from "@bi-metrics/core";
import type { SerializableThemeConfig } from "@bi-metrics/core/theme";
import type { Locale, LanguagePack } from "@bi-metrics/core/translation";

import type { Languages } from "../features";

export interface BrandProps {
  path: string;
  icon: string;
  alt: string;
  tooltip: string;
  text: string;
  hide_logo?: boolean;
}

export interface NavBarProps {
  can_access_recently_archived?: boolean;
  show_watermark: boolean;
  bug_report_url?: string;
  bug_report_text?: string;
  bug_report_icon?: string;
  version_string?: string;
  version_sha?: string;
  build_number?: string;
  documentation_url?: string;
  documentation_text?: string;
  documentation_icon?: string;
  languages: Languages;
  show_language_picker: boolean;
  user_is_anonymous: boolean;
  user_info_url: string;
  user_login_url: string;
  user_logout_url: string;
  locale: string;
}

export interface MenuObjectChildProps {
  label: string;
  name?: string;
  icon?: React.ReactNode;
  index?: number;
  url?: string;
  onClick?: () => void;
  isFrontendRoute?: boolean;
  perm?: string | boolean;
  view?: string;
  disable?: boolean;
}

export interface MenuObjectProps extends MenuObjectChildProps {
  childs?: (MenuObjectChildProps | string)[];
  isHeader?: boolean;
}

export interface MenuData {
  menu: MenuObjectProps[];
  brand: BrandProps;
  navbar_right: NavBarProps;
  settings: MenuObjectProps[];
  environment_tag: {
    text: string;
    color: string;
  };
}

export interface BootstrapThemeDataConfig {
  default: SerializableThemeConfig | {};
  dark: SerializableThemeConfig | {};
  defaultMode?: string;
  enableUiThemeAdministration?: boolean;
}

export type User = {
  createdOn?: string;
  email?: string;
  firstName: string;
  isActive: boolean;
  isAnonymous: boolean;
  lastName: string;
  userId?: number;
  username: string;
  loginCount?: number;
};

export type UserRoles = Record<string, [string, string][]>;
export interface PermissionsAndRoles {
  permissions: {
    database_access?: string[];
    datasource_access?: string[];
  };
  roles: UserRoles;
  groups: string[];
}

export type UserWithPermissionsAndRoles = User & PermissionsAndRoles;

export type UndefinedUser = {};

export type BootstrapUser = UserWithPermissionsAndRoles | undefined;

export interface CommonBootstrapData {
  application_root: string;
  static_assets_prefix: string;
  conf: JsonObject;
  locale: Locale;
  feature_flags: FeatureFlagMap;
  language_pack: LanguagePack;
  extra_categorical_color_schemes: ColorSchemeConfig[];
  extra_sequential_color_schemes: SequentialSchemeConfig[];
  extra_theme_tokens: string[];
  theme: BootstrapThemeDataConfig;
  menu_data: MenuData;
  d3_format: Partial<FormatLocaleDefinition>;
  d3_time_format: Partial<TimeLocaleDefinition>;
  pdf_compression_level: "NONE" | "FAST" | "MEDIUM" | "SLOW";
  user_subject_id?: number;
  user_subjects?: number[];
}

export interface BootstrapData {
  user?: BootstrapUser;
  common: CommonBootstrapData;
  auth_messages?: [string, string][];
  config?: {
    GUEST_TOKEN_HEADER_NAME?: string;
    GUEST_TOKEN_HEADER_MAX_BYTES?: number | null;
  };
  embedded?: {
    dashboard_id: string;
    allowed_domains?: string[];
  };
  requested_query?: JsonObject;
}
