export type SliderElementIds = "dots" | "thumbnails" | "nav-buttons";

export function getSliderIdFor(
  continerId: string,
  elementId: SliderElementIds,
) {
  return `${continerId}-${elementId}`;
}
