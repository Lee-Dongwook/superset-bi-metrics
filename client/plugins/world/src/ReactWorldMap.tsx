import { useEffect, useRef } from "react";
import WorldMap, { WorldMapProps } from "./WorldMap";

export default function ReactWorldMap(props: WorldMapProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      WorldMap(ref.current, props);
    }
  });

  return <div ref={ref} />;
}
