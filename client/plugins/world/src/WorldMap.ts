import * as d3 from "d3";
import type { ExtendedFeature, ExtendedFeatureCollection, GeoProjection } from "d3";
import worldGeo from "./world.geo.json";

const world = worldGeo as ExtendedFeatureCollection;

export enum ColorBy {
  Metric = "metric",
  Country = "country",
}

export type WorldMapProjection = "2d" | "3d";

export type ValueFormatter = (value: number) => string;

export interface WorldMapDataEntry {
  /** ISO 3166-1 alpha-3, matched against the map's country ids */
  country: string;
  sourceValue?: string;
  code: string;
  latitude: number;
  longitude: number;
  name: string;
  m1: number;
  m2: number;
}

interface ProcessedDataEntry extends WorldMapDataEntry {
  radius: number;
  fillColor: string;
}

export interface WorldMapFilterState {
  selectedValues?: string[];
  [key: string]: unknown;
}

export interface WorldMapTheme {
  colorBorder: string;
  colorSplit: string;
  colorIcon: string;
  colorTextSecondary: string;
  colorOcean: string;
}

export const defaultTheme: WorldMapTheme = {
  colorBorder: "#e5e7eb",
  colorSplit: "#ffffff",
  colorIcon: "#6b7280",
  colorTextSecondary: "#374151",
  colorOcean: "#f0f6ff",
};

export interface WorldMapProps {
  projection: WorldMapProjection;
  countryFieldType: "name" | "code";
  entity: string;
  data: WorldMapDataEntry[];
  width: number;
  height: number;
  maxBubbleSize: number;
  showBubbles: boolean;
  /** d3-scale-chromatic interpolator name, e.g. "Blues" -> d3.interpolateBlues */
  linearColorScheme: string;
  color: string;
  colorBy: ColorBy;
  /** d3-scale-chromatic scheme name, e.g. "Tableau10" -> d3.schemeTableau10 */
  colorScheme: string;
  theme: WorldMapTheme;
  onContextMenu?: (
    x: number,
    y: number,
    payload: Record<string, unknown>,
  ) => void;
  setDataMask: (dataMask: Record<string, unknown>) => void;
  inContextMenu: boolean;
  filterState: WorldMapFilterState;
  emitCrossFilters: boolean;
  formatter: ValueFormatter;
}

const scheme = (name: string) => (d3 as unknown as Record<string, unknown>)[name];

function WorldMap(element: HTMLElement, props: WorldMapProps): void {
  const {
    projection: projectionType,
    countryFieldType,
    entity,
    data,
    width,
    height,
    maxBubbleSize,
    showBubbles,
    linearColorScheme,
    color,
    colorBy,
    colorScheme,
    theme,
    onContextMenu,
    setDataMask,
    inContextMenu,
    filterState,
    emitCrossFilters,
    formatter,
  } = props;

  const div = d3.select(element);
  div.classed("bi-metrics-chart-world-map", true);
  div.selectAll("*").remove();

  const filteredData = data.filter((d) => d.country && d.country !== "XXX");

  const extRadius = d3.extent(filteredData, (d) => Math.sqrt(d.m2));
  const radiusScale = d3
    .scaleLinear()
    .domain([extRadius[0] ?? 0, extRadius[1] ?? 1])
    .range([1, maxBubbleSize]);

  let fillOf: (d: WorldMapDataEntry) => string;
  if (colorBy === ColorBy.Country) {
    const colors = scheme(`scheme${colorScheme}`) as readonly string[] | undefined;
    const colorFn = d3.scaleOrdinal(colors ?? d3.schemeTableau10);
    fillOf = (d) => colorFn(d.name);
  } else {
    const extents = d3.extent(
      filteredData.filter((d) => d.m1 != null),
      (d) => d.m1,
    );
    const interpolator = scheme(`interpolate${linearColorScheme}`) as
      | ((t: number) => string)
      | undefined;
    const colorFn = d3
      .scaleSequential(interpolator ?? d3.interpolateBlues)
      .domain([extents[0] ?? 0, extents[1] ?? 1]);
    fillOf = (d) => (d.m1 != null ? colorFn(d.m1) : theme.colorBorder);
  }

  const processedData: ProcessedDataEntry[] = filteredData.map((d) => ({
    ...d,
    radius: radiusScale(Math.sqrt(d.m2)),
    fillColor: fillOf(d),
  }));

  const mapData: Record<string, ProcessedDataEntry> = {};
  processedData.forEach((d) => {
    mapData[d.country] = d;
  });

  const getCountryValue = (key: string) =>
    mapData[key]?.sourceValue ??
    (countryFieldType === "name" ? mapData[key]?.name : mapData[key]?.code);

  const selected = filterState.selectedValues ?? [];

  const getCrossFilterDataMask = (key: string) => {
    const country = getCountryValue(key);
    if (!country) {
      return undefined;
    }
    const isCurrentValueSelected = selected.includes(key);
    const values = isCurrentValueSelected ? [] : [country];

    return {
      dataMask: {
        extraFormData: {
          filters: values.length
            ? [{ col: entity, op: "IN", val: values }]
            : [],
        },
        filterState: {
          value: values.length ? values : null,
          selectedValues: values.length ? [key] : null,
        },
      },
      isCurrentValueSelected,
    };
  };

  const handleClick = (event: MouseEvent, key: string) => {
    if (!emitCrossFilters) {
      return;
    }
    event.preventDefault();
    const dataMask = getCrossFilterDataMask(key)?.dataMask;
    if (dataMask) {
      setDataMask(dataMask);
    }
  };

  const handleContextMenu = (event: MouseEvent, key: string) => {
    event.preventDefault();
    const val = getCountryValue(key);
    if (onContextMenu) {
      onContextMenu(event.clientX, event.clientY, {
        drillToDetail: val
          ? [{ col: entity, op: "==", val, formattedVal: val }]
          : undefined,
        crossFilter: getCrossFilterDataMask(key),
        drillBy: {
          filters: val ? [{ col: entity, op: "==", val }] : undefined,
          groupbyFieldName: "entity",
        },
      });
    }
  };

  const is3d = projectionType === "3d";
  const sphere: d3.GeoPermissibleObjects = { type: "Sphere" };
  const projection: GeoProjection = (
    is3d ? d3.geoOrthographic().clipAngle(90) : d3.geoEquirectangular()
  ).fitSize([width, height], sphere);
  const path = d3.geoPath(projection);

  const svg = div
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("cursor", is3d ? "grab" : "default");

  const ocean = svg
    .append("path")
    .datum(sphere)
    .attr("fill", is3d ? theme.colorOcean : "none");

  const countryFill = (id: string) => mapData[id]?.fillColor ?? theme.colorBorder;

  const countries = svg
    .append("g")
    .selectAll<SVGPathElement, ExtendedFeature>("path")
    .data(world.features)
    .join("path")
    .attr("class", (f) => `datamaps-subunit ${f.id}`)
    .attr("fill", (f) => countryFill(String(f.id)))
    .attr("fill-opacity", (f) =>
      selected.length && !selected.includes(String(f.id)) ? 0.35 : 1,
    )
    .attr("stroke", theme.colorSplit)
    .attr("stroke-width", 1)
    .on("click", (event, f) => handleClick(event, String(f.id)))
    .on("contextmenu", (event, f) => handleContextMenu(event, String(f.id)));

  if (!inContextMenu) {
    countries
      .on("mouseenter", function () {
        d3.select(this)
          .attr("fill", color)
          .attr("stroke", theme.colorIcon)
          .raise();
      })
      .on("mouseleave", function (_, f) {
        d3.select(this)
          .attr("fill", countryFill(String(f.id)))
          .attr("stroke", theme.colorSplit);
      })
      // ponytail: native <title> tooltip, swap for a styled hoverinfo div if design needs it
      .append("title")
      .text((f) => {
        const d = mapData[String(f.id)];
        return d ? `${d.name}\n${formatter(d.m1)}` : String(f.properties?.name ?? "");
      });
  }

  const bubbles = showBubbles
    ? svg
        .append("g")
        .selectAll<SVGCircleElement, ProcessedDataEntry>("circle")
        .data(processedData)
        .join("circle")
        .attr("class", "datamaps-bubble")
        .attr("r", (d) => d.radius)
        .style("fill", color)
        .style("fill-opacity", 0.5)
        .style("stroke", color)
        .on("click", (event, d) => handleClick(event, d.country))
        .on("contextmenu", (event, d) => handleContextMenu(event, d.country))
    : null;

  if (bubbles && !inContextMenu) {
    bubbles
      .on("mouseenter", function () {
        d3.select(this)
          .style("fill-opacity", 0.85)
          .style("stroke", theme.colorTextSecondary)
          .style("stroke-width", 2);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .style("fill-opacity", 0.5)
          .style("stroke", color)
          .style("stroke-width", 1);
      })
      .append("title")
      .text((d) => `${d.name}\n${formatter(d.m2)}`);
  }

  const render = () => {
    ocean.attr("d", path);
    countries.attr("d", path);
    if (bubbles) {
      const center = projection.invert!([width / 2, height / 2])!;
      bubbles
        .attr("transform", (d) => {
          const [x, y] = projection([d.longitude, d.latitude]) ?? [0, 0];
          return `translate(${x},${y})`;
        })
        // hide bubbles on the far side of the globe
        .attr("display", (d) =>
          is3d &&
          d3.geoDistance([d.longitude, d.latitude], center) > Math.PI / 2
            ? "none"
            : null,
        );
    }
  };
  render();

  if (is3d) {
    // degrees per dragged pixel at the globe's center
    const k = 180 / (Math.PI * projection.scale());
    svg.call(
      d3
        .drag<SVGSVGElement, unknown>()
        .on("start", () => svg.style("cursor", "grabbing"))
        .on("drag", (event) => {
          const [lambda, phi] = projection.rotate();
          projection.rotate([
            lambda + event.dx * k,
            Math.max(-90, Math.min(90, phi - event.dy * k)),
          ]);
          render();
        })
        .on("end", () => svg.style("cursor", "grab")),
    );
  }
}

WorldMap.displayName = "WorldMap";

export default WorldMap;
