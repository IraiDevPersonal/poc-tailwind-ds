import type { SilderProviderOptions } from "./types";

export const SLIDER_DEFAULT_OPTIONS: SilderProviderOptions = {
  classNames: {
    dot: "w-2 h-2 block rounded-full bg-neutral-200 transition-all ease-in-out duration-300 outline-none focus:outline-none",
    dotActive: "w-5 bg-red-400",
  },
  sliderOptions: {
    containScroll: "trimSnaps",
    showDots: true,
    slidesToScroll: 1,
    align: "start",
    startIndex: 0,
    loop: false,
    skipSnaps: true,
    dragFree: true,
  },
  mountOnInit: true,
};
