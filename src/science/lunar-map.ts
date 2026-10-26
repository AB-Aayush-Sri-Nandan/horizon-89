/** Presentation mapping for a north-up cylindrical image spanning -180…+180° east.
 * This scene-axis convention is not a SPICE frame or a terrain coordinate model.
 */
export function lunarSiteToUV(latitude: number, longitudeEast: number): [number, number] {
  return [(longitudeEast + 180) / 360, (latitude + 90) / 180];
}
export function lunarSiteToPosition(latitude: number, longitudeEast: number, radius = 1): [number, number, number] {
  const phi = (90 - latitude) * Math.PI / 180;
  const theta = (longitudeEast + 180) * Math.PI / 180;
  return [-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)];
}
