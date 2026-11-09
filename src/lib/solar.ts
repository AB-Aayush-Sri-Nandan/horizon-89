import { solarBodies } from "../data/catalog.ts";
export interface SolarSession {
  selected: string;
  day: number;
  tracking: boolean;
}
/** Circular, compressed display coordinates with arbitrary phases: never an ephemeris. */
export function solarPosition(
  name: string,
  day: number,
): [number, number, number] {
  const index = solarBodies.findIndex((b) => b.name === name);
  if (index < 0 || !Number.isFinite(day))
    throw new Error("Unknown object or invalid schematic day");
  const body = solarBodies[index];
  if (name === "Moon") {
    const earth = solarPosition("Earth", day),
      angle = (day / 27.32) * Math.PI * 2;
    return [
      earth[0] + 0.62 * Math.cos(angle),
      0.05,
      earth[2] + 0.62 * Math.sin(angle),
    ];
  }
  const angle =
    (body.period ? (day / body.period) * 2 * Math.PI : 0) + index * 0.8;
  return [Math.cos(angle) * body.orbit, 0, Math.sin(angle) * body.orbit];
}
export function smoothFlight(t: number) {
  const bounded = Math.max(0, Math.min(1, t));
  return bounded * bounded * (3 - 2 * bounded);
}
