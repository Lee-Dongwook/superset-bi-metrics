declare module "*.png" {
  const value: any;
  export default value;
}

declare module "*.jpg";

declare module "echarts/i18n/lang*" {
  const lang: Parameters<typeof import("echarts/core").registerLocale>[1];
  export default lang;
}
