import EmblaCarousel, { type EmblaCarouselType } from "embla-carousel";
import { cn } from "@lib/utils";
import { SLIDER_DEFAULT_OPTIONS } from "./constants";
import type { SilderProviderOptions, SliderUniqueSnaps } from "./types";

/**
 * Proveedor de lógica y funcionalidad para componentes de tipo Slider.
 * Facilita la integración con Embla Carousel, gestionando automáticamente la sincronización
 * de puntos de navegación (dots) y miniaturas (thumbnails).
 *
 * @example
 * const options = {
 *   sliderOptions: {
 *     showThumbnails: true,
 *     showDots: true,
 *   },
 *   mountOnInit: true,
 * };
 *
 * new SliderProvider('mi-slider-id', options);
 *
 * @note
 * El funcionamiento de las miniaturas (thumbnails) está optimizado para sliders que muestran
 * una única diapositiva a la vez. Aunque se permite su uso con múltiples tarjetas visibles,
 * la sincronización del estado activo en los thumbnails podría no ser exacta.
 *
 * @param id - Identificador único del contenedor raíz del slider.
 * El sistema localizará automáticamente los elementos relacionados mediante sufijos:
 * - Puntos de paginación: `${id}-dots`
 * - Miniaturas: `${id}-thumbnails`
 *
 * @param options - Configuraciones opcionales para personalizar clases, opciones de Embla y auto-montaje.
 *
 * Configuraciones por defecto:
 * - `mountOnInit`: true (montaje automático al instanciar).
 * - `sliderOptions.showDots`: true (gestión de puntos habilitada).
 * - `sliderOptions.showThumbnails`: false (miniaturas deshabilitadas por defecto).
 * - `sliderOptions.containScroll`: 'trimSnaps' (evita espacios vacíos al inicio/final).
 * - `sliderOptions.skipSnaps`: true (permite desplazamientos fluidos entre tarjetas).
 * - `sliderOptions.dragFree`: true (habilita arrastre libre).
 */
export class SliderProvider {
  private sliderInstance: EmblaCarouselType;
  private dotsContainerEl: HTMLElement | null;
  private thumbnailsContainerEl: HTMLElement | null;
  private options: SilderProviderOptions;

  constructor(id: string, options: Partial<SilderProviderOptions> = {}) {
    this.options = this.mergeOptions(options);

    const containerEl = document.getElementById(id);
    const dotsContainerEl = document.getElementById(`${id}-dots`);
    const thumbnailsContainerEl = document.getElementById(`${id}-thumbnails`);

    if (!containerEl) {
      throw new Error(`Container not found`);
    }

    if (!dotsContainerEl && this.showDots()) {
      throw new Error(`Dots container not found`);
    }

    if (!thumbnailsContainerEl && this.showThumbnails()) {
      throw new Error(`Thumbnails container not found`);
    }

    if (!this.showDots()) {
      dotsContainerEl!.hidden = true;
    }

    if (!this.showThumbnails()) {
      thumbnailsContainerEl!.hidden = true;
    }

    this.dotsContainerEl = dotsContainerEl;
    this.thumbnailsContainerEl = thumbnailsContainerEl;
    this.sliderInstance = EmblaCarousel(
      containerEl,
      this.options.sliderOptions,
    );

    if (this.options.mountOnInit) {
      this.mount();
    }
  }

  private showDots = (): boolean => {
    return !!this.options.sliderOptions.showDots;
  };

  private showThumbnails = (): boolean => {
    return !!this.options.sliderOptions.showThumbnails;
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
    if (!this.showDots()) return;
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
    if (!this.showDots()) return;
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
   * Establece click listener y estado activo para los thumbnails dentro del su contenedor.
   */
  private setupThumbnails = () => {
    if (!this.showThumbnails()) return;
    if (!this.thumbnailsContainerEl) return;

    const thumbnails = this.thumbnailsContainerEl.querySelectorAll("button");

    thumbnails.forEach((thumbnail, index) => {
      if (thumbnail.dataset.thumbnailInitialized === "true") return;

      thumbnail.addEventListener("click", () => {
        this.sliderInstance.scrollTo(index);
      });
      thumbnail.dataset.thumbnailInitialized = "true";
    });

    this.updateThumbnails();
  };

  /**
   * Actualiza las clases CSS activas de los thumbnails cuando el slider cambia de posición.
   */
  private updateThumbnails = () => {
    if (!this.showThumbnails()) return;
    if (!this.thumbnailsContainerEl) return;

    const selectedIndex = this.sliderInstance.selectedScrollSnap();
    const thumbnails = this.thumbnailsContainerEl.querySelectorAll("button");

    thumbnails.forEach((thumbnail, index) => {
      const isActive = index === selectedIndex;
      thumbnail.dataset.active = isActive.toString();
    });
  };

  /**
   * Se suscribe a los eventos de Embla Carousel y adjunta escuchadores de eventos externos.
   * Configura la sincronización de los puntos de paginación y habilita el desplazamiento personalizado con la rueda del ratón.
   */
  public mount = () => {
    this.sliderInstance.on("init", () => {
      this.buildDots();
      this.setupThumbnails();
    });
    this.sliderInstance.on("reInit", () => {
      this.buildDots();
      this.setupThumbnails();
    });
    this.sliderInstance.on("select", () => {
      this.updateDots();
      this.updateThumbnails();
    });

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
