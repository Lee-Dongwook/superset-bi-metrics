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
