import type { SilderProviderOptions } from "./types";

export const SLIDER_DEFAULT_OPTIONS: SilderProviderOptions = {
  classNames: {
    dot: "w-(--dot-size,8px) h-(--dot-size,8px) block rounded-full bg-(--dot-bg,var(--color-neutral-200)) transition-all ease-in-out duration-300 outline-none focus:outline-none",
    dotActive:
      "w-(--dot-active-width,20px) bg-(--dot-active-bg,var(--color-red-400))",
  },
  sliderOptions: {
    containScroll: "trimSnaps",
    showThumbnails: false,
    showNavButtons: false,
    slidesToScroll: 1,
    skipSnaps: true,
    dragFree: true,
    showDots: false,
    align: "start",
    startIndex: 0,
    loop: false,
  },
  mountOnInit: true,
};
