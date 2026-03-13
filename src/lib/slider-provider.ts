import EmblaCarousel, {
  type EmblaCarouselType,
  type EmblaOptionsType,
} from "embla-carousel";
import { cn } from "./utils";

type ClassNames = {
  dot: string;
  dotActive: string;
};

export type SilderProviderOptions = Partial<{
  classNames: Partial<ClassNames>;
  sliderOptions: Partial<EmblaOptionsType>;
}>;

const DEFAULT_OPTIONS: SilderProviderOptions = {
  classNames: {
    dot: "w-2 h-2 block rounded-full bg-neutral-200 transition-all ease-in-out duration-300 outline-none focus:outline-none",
    dotActive: "w-5 bg-red-400",
  },
  sliderOptions: {
    containScroll: "keepSnaps",
    slidesToScroll: 1,
    align: "start",
    startIndex: 0,
    loop: false,
  },
};

export class SliderProvider {
  private slider: EmblaCarouselType;
  private dotsContainerEl: HTMLElement;
  private options: SilderProviderOptions;

  constructor(
    selector: string | HTMLElement,
    options: SilderProviderOptions = DEFAULT_OPTIONS,
  ) {
    const containerEl =
      typeof selector === "string"
        ? document.getElementById(selector)
        : selector;
    const dotsContainerEl = document.getElementById(`${selector}-dots`);

    if (!containerEl) {
      throw new Error(`Container not found`);
    }

    if (!dotsContainerEl) {
      throw new Error(`Dots container not found`);
    }

    this.options = options;
    this.dotsContainerEl = dotsContainerEl;
    this.slider = EmblaCarousel(containerEl, options.sliderOptions);
  }

  private buildClasses = (
    isActive: boolean,
    selector: keyof ClassNames,
    activeSelector?: keyof ClassNames,
  ) => {
    return cn(
      this.options?.classNames?.[selector],
      activeSelector && isActive && this.options?.classNames?.[activeSelector],
    );
  };

  private buildDots = () => {
    this.dotsContainerEl.innerHTML = "";
    const snapList = this.slider.scrollSnapList();
    
    // Ocultar container si hay 1 o menos snaps
    if (snapList.length <= 1) {
      this.dotsContainerEl.style.display = "none";
      return;
    }
    
    this.dotsContainerEl.style.display = ""; // Restaurar display original

    const selectedIndex = this.slider.selectedScrollSnap();

    snapList.forEach((_, index) => {
      const dot = document.createElement("button");
      const isActive = index === selectedIndex;

      dot.className = this.buildClasses(isActive, "dot", "dotActive");
      dot.addEventListener("click", () => this.slider.scrollTo(index));
      this.dotsContainerEl.appendChild(dot);
    });
  };

  private updateDots = () => {
    const selectedIndex = this.slider.selectedScrollSnap();

    this.dotsContainerEl.querySelectorAll("button").forEach((dot, index) => {
      const isActive = index === selectedIndex;

      dot.className = this.buildClasses(isActive, "dot", "dotActive");
    });
  };

  public mount = () => {
    this.slider.on("init", this.buildDots);
    this.slider.on("reInit", this.buildDots);
    this.slider.on("select", this.updateDots);

    // Mouse wheel scroll
    let wheelTimeout: ReturnType<typeof setTimeout>;
    this.slider.containerNode().addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          if (e.deltaX > 0 || e.deltaY > 0) {
            this.slider.scrollNext();
          } else {
            this.slider.scrollPrev();
          }
        }, 50);
      },
      { passive: false },
    );
  };
}
