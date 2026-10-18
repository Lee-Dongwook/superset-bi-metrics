export enum ObjectFormattingEnum {
  BACKGROUND_COLOR = "BACKGROUND_COLOR",
  TEXT_COLOR = "TEXT_COLOR",
  CELL_BAR = "CELL_BAR",
  ENTIRE_ROW = "ENTIRE_ROW",
}

export type ColorFormatters = {
  column: string;
  toAllRow?: boolean;
  toTextColor?: boolean;
  columnFormatting?: string;
  objectFormatting?: ObjectFormattingEnum;
  getColorFromValue: (
    value: number | string | boolean | null,
  ) => string | undefined;
}[];
