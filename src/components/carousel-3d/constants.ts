import type { Carousel3DProviderOptions } from "./types";

export const CAROUSEL_3D_DEFAULT_OPTIONS: Carousel3DProviderOptions = {
  emblaOptions: {
    loop: true,
    align: "center",
    skipSnaps: false,
    dragFree: false,
    containScroll: false,
    showDots: false,
  },
  mountOnInit: true,
  perspective: 1200,
  rotateYPerStep: 25,
  scalePerStep: 0.12,
  opacityPerStep: 0.22,
};
