export type Column = {
  name: string;
  column_name: string;
  type: string;
  type_generic: GenericDataType;
  is_dttm: boolean;
};

export declare interface Table {
  name: string;
  columns: Column[];
}

export declare interface Catalog {}

export declare interface Schema {
  tables: Table[];
}

export declare interface Database {
  id: number;
  name: string;
  catalogs: Catalog[];
  schemas: Schema[];
}

export type ErrorLevel = "info" | "warning" | "error";

export type CoreError = {
  error_type: string;
  extra: Record<string, any>;
  level: ErrorLevel;
  message: string;
};

export enum GenericDataType {
  Numeric = 0,
  String = 1,
  Temporal = 2,
  Boolean = 3,
  MultiValue = 4,
}

export declare class Disposable {
  static from(
    ...dispoasableLikes: {
      dispose: () => any;
    }[]
  ): Disposable;

  constructor(callOnDispose: () => any);

  dispose(): any;
}

export declare interface Event<T> {
  (listener: (e: T) => any, thisArgs?: any): Disposable;
}

export interface Extension {
  dependencies: string[];
  description: string;
  id: string;
  name: string;
  version: string;
}
