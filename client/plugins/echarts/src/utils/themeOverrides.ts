import { mergeWith, isPlainObject } from "lodash-es";

export function mergeEchartsThemeOverrides<T = any>(...sources: any[]): T {
  const customizer = (objValue: any, srcValue: any): any => {
    if (Array.isArray(srcValue)) {
      return srcValue;
    }

    if (Array.isArray(objValue) && isPlainObject(srcValue)) {
      return objValue.map((item) =>
        isPlainObject(item) ? mergeWith({}, item, srcValue, customizer) : item,
      );
    }

    return undefined;
  };

  return mergeWith({}, ...sources, customizer);
}
