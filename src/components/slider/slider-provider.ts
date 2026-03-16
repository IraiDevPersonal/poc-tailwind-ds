import EmblaCarousel, { type EmblaCarouselType } from "embla-carousel";
import { cn } from "../../lib/utils";
import { SLIDER_DEFAULT_OPTIONS } from "./constants";
import type { SilderProviderOptions, SliderUniqueSnaps } from "./types";

/**
 * Proveedor de funcionalidad para Slider.
 *
 * @param selector - El selector (string) del contenedor del carrusel (ej: #devices, .devices).
 * El sistema intentará encontrar automáticamente un contenedor de paginación añadiendo el sufijo `-dots` al selector.
 * @param options - Configuraciones parciales para sobrescribir los valores por defecto (clases, opciones de Embla, auto-montaje).
 *
 * Opciones por defecto:
 * - `mountOnInit`: true (se monta automáticamente al instanciar).
 * - `sliderOptions.showPagination`: true (muestra puntos de navegación).
 * - `sliderOptions.containScroll`: 'trimSnaps' (limita el scroll a zonas con contenido).
 * - `sliderOptions.skipSnaps`: true (permite desplazamientos rápidos sin rebote).
 * - `sliderOptions.dragFree`: true (arrastre fluido).
 */
export class SliderProvider {
  private sliderInstance: EmblaCarouselType;
  private dotsContainerEl: HTMLElement | null;
  private options: SilderProviderOptions;

  constructor(selector: string, options: Partial<SilderProviderOptions> = {}) {
    this.options = this.mergeOptions(options);

    const containerEl = document.querySelector<HTMLElement>(selector);
    const dotsContainerEl = document.querySelector<HTMLElement>(
      `${selector}-dots`,
    );

    if (!containerEl) {
      throw new Error(`Container not found`);
    }

    if (!dotsContainerEl && this.showPagination()) {
      throw new Error(`Dots container not found`);
    }

    this.dotsContainerEl = dotsContainerEl;
    this.sliderInstance = EmblaCarousel(
      containerEl,
      this.options.sliderOptions,
    );

    if (this.options.mountOnInit) {
      this.mount();
    }
  }

  private showPagination = (): boolean => {
    return !!this.options.sliderOptions.showPagination;
  };

  /**
   * Realiza una combinación profunda (deep merge) de las opciones proporcionadas con las opciones por defecto.
   * Asegura que las configuraciones personalizadas sobrescriban solo los valores predeterminados específicos.
   * @param options - Las opciones parciales proporcionadas por el usuario.
   * @returns El objeto de opciones completamente combinado.
   */
  private mergeOptions = (
    options: Partial<SilderProviderOptions>,
  ): SilderProviderOptions => {
    return {
      classNames: {
        ...SLIDER_DEFAULT_OPTIONS.classNames,
        ...options.classNames,
      },
      sliderOptions: {
        ...SLIDER_DEFAULT_OPTIONS.sliderOptions,
        ...options.sliderOptions,
      },
      mountOnInit: options.mountOnInit ?? SLIDER_DEFAULT_OPTIONS.mountOnInit,
    };
  };

  /**
   * Construye la cadena de clases CSS para un elemento punto (dot) basada en su estado activo.
   * @param isActive - Indica si el punto actual representa el snap seleccionado.
   * @returns string de las clases CSS combinadas.
   */
  private buildDotClasses = (isActive: boolean): string => {
    return cn(
      this.options.classNames.dot,
      isActive && this.options.classNames.dotActive,
    );
  };

  /**
   * Filtra las posiciones de desplazamiento (snap) duplicadas.
   * Con `containScroll: "keepSnaps"`, los últimos snaps pueden apuntar a la misma posición visual exacta.
   * Este método asegura que solo generemos puntos para posiciones visuales únicas.
   * @returns Un objeto que contiene los snaps únicos, sus índices originales y la lista completa de snaps.
   */
  private getUniqueSnaps = (): SliderUniqueSnaps => {
    const snapList = this.sliderInstance.scrollSnapList();
    const uniqueSnaps: number[] = [];
    const indexMapping: number[] = [];

    snapList.forEach((snap, index) => {
      const existingIndex = uniqueSnaps.findIndex(
        (s) => Math.abs(s - snap) < 0.1,
      );

      if (existingIndex === -1) {
        uniqueSnaps.push(snap);
        indexMapping.push(index);
      }
    });

    return { uniqueSnaps, indexMapping, snapList };
  };

  /**
   * Obtiene el índice del snap seleccionado en la lista de snaps únicos.
   * @param uniqueSnaps - Lista de snaps únicos.
   * @param snapList - Lista completa de snaps.
   * @returns El índice del snap seleccionado en la lista de snaps únicos.
   */
  private getUniqueSelectedIndex = ({
    uniqueSnaps,
    snapList,
  }: Omit<SliderUniqueSnaps, "indexMapping">): number => {
    const selectedIndex = this.sliderInstance.selectedScrollSnap();
    const currentSnap = snapList[selectedIndex];
    return uniqueSnaps.findIndex((s) => Math.abs(s - currentSnap) < 0.1);
  };

  /**
   * Inicializa y renderiza los puntos de paginación dentro del contenedor de puntos.
   * Los elementos se crean dinámicamente basándose en las posiciones de desplazamiento únicas.
   * Oculta el contenedor de puntos por completo si hay 1 o menos snaps únicos disponibles.
   */
  private buildDots = () => {
    if (!this.showPagination()) return;
    if (!this.dotsContainerEl) return;

    this.dotsContainerEl.innerHTML = "";
    const { uniqueSnaps, indexMapping, snapList } = this.getUniqueSnaps();

    // Oculta container si hay 1 o menos snaps
    if (uniqueSnaps.length <= 1) {
      this.dotsContainerEl.style.display = "none";
      return;
    }

    this.dotsContainerEl.style.display = ""; // Restaurar display original

    const uniqueSelectedIndex = this.getUniqueSelectedIndex({
      uniqueSnaps,
      snapList,
    });

    uniqueSnaps.forEach((_, index) => {
      const dot = document.createElement("button");
      const isActive = index === uniqueSelectedIndex;

      dot.className = this.buildDotClasses(isActive);
      const targetIndex = indexMapping[index];
      dot.addEventListener("click", () =>
        this.sliderInstance.scrollTo(targetIndex),
      );
      this.dotsContainerEl!.appendChild(dot);
    });
  };

  /**
   * Actualiza las clases CSS activas de los puntos de paginación cuando el slider cambia de posición.
   */
  private updateDots = () => {
    if (!this.showPagination()) return;
    if (!this.dotsContainerEl) return;

    const { uniqueSnaps, snapList } = this.getUniqueSnaps();
    const uniqueSelectedIndex = this.getUniqueSelectedIndex({
      uniqueSnaps,
      snapList,
    });

    this.dotsContainerEl.querySelectorAll("button").forEach((dot, index) => {
      const isActive = index === uniqueSelectedIndex;
      dot.className = this.buildDotClasses(isActive);
    });
  };

  /**
   * Se suscribe a los eventos de Embla Carousel y adjunta escuchadores de eventos externos.
   * Configura la sincronización de los puntos de paginación y habilita el desplazamiento personalizado con la rueda del ratón.
   */
  public mount = () => {
    this.sliderInstance.on("init", this.buildDots);
    this.sliderInstance.on("reInit", this.buildDots);
    this.sliderInstance.on("select", this.updateDots);

    // Mouse wheel scroll
    let wheelTimeout: ReturnType<typeof setTimeout>;
    this.sliderInstance.containerNode().addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          if (e.deltaX > 0 || e.deltaY > 0) {
            this.sliderInstance.scrollNext();
          } else {
            this.sliderInstance.scrollPrev();
          }
        }, 50);
      },
      { passive: false },
    );
  };
}
