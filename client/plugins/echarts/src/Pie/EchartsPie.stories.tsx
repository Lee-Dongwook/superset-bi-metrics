import type { Meta, StoryObj } from "@storybook/react-vite";
import { GenericDataType } from "@bi-metrics/core/common";
import EchartsPie from "@bi-metrics/plugin-echarts/Pie/EchartsPie";
import transformProps from "@bi-metrics/plugin-echarts/Pie/transformProps";
import {
  EchartsPieChartProps,
  EchartsPieFormData,
  EchartsPieLabelType,
} from "@bi-metrics/plugin-echarts/Pie/types";
import { LegendOrientation } from "@bi-metrics/plugin-echarts/types";

const data = [
  { country: "Korea", sales: 4200 },
  { country: "Japan", sales: 3100 },
  { country: "USA", sales: 5800 },
  { country: "Germany", sales: 2400 },
  { country: "France", sales: 1600 },
  { country: "Brazil", sales: 900 },
];

type Args = Partial<EchartsPieFormData> & { width: number; height: number };

function PieStory({ width, height, ...formData }: Args) {
  const chartProps = {
    width,
    height,
    formData: {
      datasource: "1__table",
      viz_type: "pie",
      vizType: "pie",
      groupby: ["country"],
      metric: "sales",
      ...formData,
    },
    queriesData: [
      {
        data,
        colnames: ["country", "sales"],
        coltypes: [GenericDataType.String, GenericDataType.Numeric],
        rowcount: data.length,
      },
    ],
    hooks: {
      setDataMask: (mask) => console.log("setDataMask", mask),
      onLegendStateChanged: (state) => console.log("legend", state),
    },
    filterState: {},
    emitCrossFilters: true,
  } as EchartsPieChartProps;

  return <EchartsPie {...transformProps(chartProps)} />;
}

const meta: Meta<typeof PieStory> = {
  title: "Plugins/ECharts/Pie",
  component: PieStory,
  args: { width: 600, height: 400 },
  argTypes: {
    labelType: {
      control: "select",
      options: Object.values(EchartsPieLabelType),
    },
    legendOrientation: {
      control: "select",
      options: Object.values(LegendOrientation),
    },
    roseType: { control: "select", options: [null, "radius", "area"] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {};

export const Donut: Story = {
  args: {
    donut: true,
    showTotal: true,
    labelType: EchartsPieLabelType.KeyPercent,
    labelLine: true,
  },
};

export const Rose: Story = {
  args: {
    roseType: "area",
    labelsOutside: false,
    labelType: EchartsPieLabelType.Value,
    legendOrientation: LegendOrientation.Right,
  },
};
