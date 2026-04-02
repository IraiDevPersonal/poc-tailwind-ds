import { cn } from "@lib/utils";
import EmblaCarousel, { type EmblaCarouselType } from "embla-carousel";
import { CAROUSEL_3D_DEFAULT_OPTIONS } from "./constants";
import type { Carousel3DProviderOptions } from "./types";
import { getSliderIdFor } from "@components/slider/utils";

/**
 * Proveedor de lógica y funcionalidad para el componente Carousel3D.
 * Recrea el efecto coverflow 3D (similar a atobeach.com) usando Embla Carousel.
 *
 * Cada slide se transforma en el eje Y con perspectiva, escala y opacidad
 * interpoladas de forma continua durante el arrastre, sincronizando los transforms
 * fotograma a fotograma con la animación interna de Embla.
 *
 * @example
 * new Carousel3DProvider('mi-carousel-id', {
 *   emblaOptions: { showDots: true, loop: true },
 *   rotateYPerStep: 30,
 * });
 *
 * @param id - ID del elemento raíz del carousel (viewport de Embla).
 * El sistema localizará automáticamente los elementos relacionados:
 * - Puntos de paginación: `${id}-dots`
 *
 * @param options - Configuración parcial que se mezcla con los valores por defecto.
 */
export class Carousel3DProvider {
  private sliderInstance: EmblaCarouselType;
  private dotsContainerEl: HTMLElement | null;
  private options: Carousel3DProviderOptions;

  constructor(id: string, options: Partial<Carousel3DProviderOptions> = {}) {
    this.options = this.mergeOptions(options);

    const viewportEl = document.getElementById(id);
    const dotsContainerEl = document.getElementById(
      getSliderIdFor(id, "dots"),
    );

    if (!viewportEl) {
      throw new Error(`Carousel3D container not found id: ${id}`);
    }

    if (!dotsContainerEl && this.showDots()) {
      throw new Error(`Carousel3D dots container not found id: ${id}`);
    }

    if (dotsContainerEl && !this.showDots()) {
      dotsContainerEl.hidden = true;
    }

    this.dotsContainerEl = dotsContainerEl;
    this.sliderInstance = EmblaCarousel(
      viewportEl,
      this.options.emblaOptions,
    );

    if (this.options.mountOnInit) {
      this.mount();
    }
  }

  private showDots = (): boolean => {
    return !!this.options.emblaOptions.showDots;
  };

  private mergeOptions = (
    options: Partial<Carousel3DProviderOptions>,
  ): Carousel3DProviderOptions => {
    return {
      ...CAROUSEL_3D_DEFAULT_OPTIONS,
      ...options,
      emblaOptions: {
        ...CAROUSEL_3D_DEFAULT_OPTIONS.emblaOptions,
        ...options.emblaOptions,
      },
    };
  };

  private buildDotClasses = (isActive: boolean): string => {
    return cn(
      "w-2 h-2 block rounded-full bg-white/40 transition-all ease-in-out duration-300 outline-none focus:outline-none",
      isActive && "w-5 bg-white",
    );
  };

  private buildDots = () => {
    if (!this.showDots() || !this.dotsContainerEl) return;

    this.dotsContainerEl.innerHTML = "";
    const snapList = this.sliderInstance.scrollSnapList();

    if (snapList.length <= 1) {
      this.dotsContainerEl.style.display = "none";
      return;
    }

    this.dotsContainerEl.style.display = "";
    const selectedIndex = this.sliderInstance.selectedScrollSnap();

    snapList.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.className = this.buildDotClasses(index === selectedIndex);
      dot.addEventListener("click", () =>
        this.sliderInstance.scrollTo(index),
      );
      this.dotsContainerEl!.appendChild(dot);
    });
  };

  private updateDots = () => {
    if (!this.showDots() || !this.dotsContainerEl) return;

    const selectedIndex = this.sliderInstance.selectedScrollSnap();
    this.dotsContainerEl.querySelectorAll("button").forEach((dot, index) => {
      dot.className = this.buildDotClasses(index === selectedIndex);
    });
  };

  /**
   * Calcula el gap normalizado entre snaps consecutivos.
   * Usado para convertir `diffToTarget` en un offset fraccional de posición.
   */
  private getSnapGap = (): number => {
    const snapList = this.sliderInstance.scrollSnapList();
    if (snapList.length <= 1) return 1;
    return snapList[1] - snapList[0];
  };

  /**
   * Aplica los transforms 3D a todos los slides de forma continua.
   * Suscribir este método al evento `scroll` de Embla garantiza que los
   * transforms se actualicen en cada fotograma durante el arrastre/animación,
   * eliminando la necesidad de transiciones CSS en los slides.
   *
   * El algoritmo:
   * 1. Para cada slide, calcula `diffToTarget = snapPos[i] - scrollProgress`.
   * 2. Si el carousel tiene loop, ajusta `diffToTarget` según los `loopPoints`
   *    de Embla (los slides reposicionados necesitan ±1 de corrección).
   * 3. Divide por el gap entre snaps para obtener el offset fraccional.
   * 4. Aplica `perspective rotateY scale opacity zIndex` interpolados.
   */
  private applyTransforms = () => {
    const embla = this.sliderInstance;
    const snapList = embla.scrollSnapList();
    const scrollProgress = embla.scrollProgress();
    const snapGap = this.getSnapGap();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine = embla.internalEngine() as any;
    const isLoop = !!engine.options.loop;

    embla.slideNodes().forEach((slide, index) => {
      let diffToTarget = snapList[index] - scrollProgress;

      if (isLoop && engine.slideLooper?.loopPoints) {
        engine.slideLooper.loopPoints.forEach(
          (loopItem: { index: number; target: () => number }) => {
            const target = loopItem.target();
            if (loopItem.index === index && target !== 0) {
              const sign = Math.sign(target);
              if (sign === -1)
                diffToTarget = snapList[index] - (1 + scrollProgress);
              if (sign === 1)
                diffToTarget = snapList[index] + (1 - scrollProgress);
            }
          },
        );
      }

      const fractionalOffset = snapGap !== 0 ? diffToTarget / snapGap : 0;
      this.applySlideTransform(slide, fractionalOffset);
    });
  };

  /**
   * Aplica el transform 3D a un slide individual basándose en su offset fraccional.
   * @param slide - El elemento DOM del slide.
   * @param offset - Distancia fraccional desde el centro (0 = centro, ±1 = adyacente, etc.)
   */
  private applySlideTransform = (slide: HTMLElement, offset: number) => {
    const { perspective, rotateYPerStep, scalePerStep, opacityPerStep } =
      this.options;

    const absOffset = Math.abs(offset);
    const clampedOffset = Math.min(absOffset, 3);

    const angle = offset * rotateYPerStep;
    const scale = Math.max(0.5, 1 - clampedOffset * scalePerStep);
    const opacity = Math.max(0.15, 1 - clampedOffset * opacityPerStep);
    const zIndex = Math.round(100 - absOffset * 20);

    slide.style.transform = `perspective(${perspective}px) rotateY(${angle}deg) scale(${scale})`;
    slide.style.opacity = opacity.toString();
    slide.style.zIndex = zIndex.toString();
  };

  /**
   * Actualiza el atributo `data-active` en los slides según el snap seleccionado.
   * Permite estilos CSS condicionales en el slide activo vía `data-[active=true]:`.
   */
  private updateActiveSlide = () => {
    const selectedIndex = this.sliderInstance.selectedScrollSnap();
    this.sliderInstance.slideNodes().forEach((slide, index) => {
      slide.dataset.active = (index === selectedIndex).toString();
    });
  };

  public mount = () => {
    this.sliderInstance.on("init", () => {
      this.applyTransforms();
      this.updateActiveSlide();
      this.buildDots();
    });
    this.sliderInstance.on("reInit", () => {
      this.applyTransforms();
      this.updateActiveSlide();
      this.buildDots();
    });
    this.sliderInstance.on("scroll", () => {
      this.applyTransforms();
    });
    this.sliderInstance.on("select", () => {
      this.updateActiveSlide();
      this.updateDots();
    });
  };
}
