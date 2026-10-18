import type { Meta, StoryObj } from "@storybook/react-vite";
import { format } from "d3";
import ReactWorldMap from "./ReactWorldMap";
import { ColorBy, defaultTheme, WorldMapProps } from "./WorldMap";

const data = [
  { country: "KOR", code: "KR", name: "Korea", latitude: 36.5, longitude: 127.9, m1: 4200, m2: 51 },
  { country: "JPN", code: "JP", name: "Japan", latitude: 36.2, longitude: 138.3, m1: 3100, m2: 125 },
  { country: "USA", code: "US", name: "United States", latitude: 37.1, longitude: -95.7, m1: 5800, m2: 331 },
  { country: "DEU", code: "DE", name: "Germany", latitude: 51.2, longitude: 10.5, m1: 2400, m2: 83 },
  { country: "FRA", code: "FR", name: "France", latitude: 46.2, longitude: 2.2, m1: 1600, m2: 67 },
  { country: "BRA", code: "BR", name: "Brazil", latitude: -14.2, longitude: -51.9, m1: 900, m2: 213 },
  { country: "AUS", code: "AU", name: "Australia", latitude: -25.3, longitude: 133.8, m1: 1300, m2: 26 },
  { country: "IND", code: "IN", name: "India", latitude: 20.6, longitude: 79.0, m1: 2000, m2: 1380 },
];

const meta: Meta<WorldMapProps> = {
  title: "Plugins/World/WorldMap",
  component: ReactWorldMap,
  args: {
    projection: "2d",
    data,
    width: 800,
    height: 450,
    countryFieldType: "code",
    entity: "country",
    maxBubbleSize: 25,
    showBubbles: false,
    colorBy: ColorBy.Metric,
    linearColorScheme: "Blues",
    colorScheme: "Tableau10",
    color: "#f59e0b",
    theme: defaultTheme,
    inContextMenu: false,
    filterState: {},
    emitCrossFilters: true,
    formatter: format(",") as (v: number) => string,
    setDataMask: (mask) => console.log("setDataMask", mask),
    onContextMenu: (x, y, payload) => console.log("contextMenu", x, y, payload),
  },
  argTypes: {
    projection: { control: "inline-radio", options: ["2d", "3d"] },
    colorBy: { control: "inline-radio", options: Object.values(ColorBy) },
    linearColorScheme: {
      control: "select",
      options: ["Blues", "Greens", "Oranges", "Viridis", "YlOrRd"],
    },
    colorScheme: {
      control: "select",
      options: ["Tableau10", "Category10", "Set2", "Pastel1"],
    },
    data: { control: false },
    theme: { control: false },
    formatter: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Flat: Story = {};

export const Globe: Story = {
  args: { projection: "3d", width: 500, height: 500, showBubbles: true },
};

export const ColorByCountry: Story = {
  args: { colorBy: ColorBy.Country, showBubbles: true },
};

export const CrossFiltered: Story = {
  args: { filterState: { selectedValues: ["KOR"] } },
};
