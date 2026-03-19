export type SliderElementIds = "dots" | "thumbnails" | "nav-buttons";

export function getSliderIdFor(
  containerId: string,
  elementId: SliderElementIds,
) {
  return `${containerId}-${elementId}`;
}
