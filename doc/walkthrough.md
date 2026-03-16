# Walkthrough: Mejoras en el Slider

He completado las mejoras solicitadas en `SliderProvider.ts`. Aquí tienes un resumen de los cambios:

## Cambios Realizados

1. **Corrección de Dots Redundantes**:
   - Se implementó la lógica en `getUniqueSnaps` para filtrar posiciones de scroll duplicadas.
   - Esto evita que aparezcan puntos adicionales al final del carrusel que no realizan ningún movimiento.

2. **Gestión de Opciones (Deep Merge)**:
   - Se añadió un método `mergeOptions` para combinar las opciones por defecto (`DEFAULT_OPTIONS`) con las proporcionadas en el constructor.
   - Esto permite sobrescribir solo atributos específicos (como una clase CSS) sin perder el resto de configuraciones predeterminadas.

3. **Documentación JSDoc en Español**:
   - Se añadieron comentarios detallados a todos los métodos principales explicando su propósito y lógica técnica, siguiendo tu petición de que fueran en español.

## Verificación

- **Playwright Analysis**: Se confirmó mediante pruebas en `/sandbox` que los últimos 3 puntos eran redundantes antes de la corrección.

![Grabación del análisis de los dots con Playwright](file:///Users/iraidev/.gemini/antigravity/brain/73f12da5-1cf7-4bd0-9ec0-e5f4e288b301/inspect_slider_dots_1773663520375.webp)

- **Pruebas de Opciones**: Se verificó que al pasar opciones parciales, los valores por defecto se mantienen correctamente.

```diff:slider-provider.ts
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
        ? document.querySelector<HTMLElement>(selector)
        : selector;
    const dotsContainerEl = document.querySelector<HTMLElement>(
      `${selector}-dots`,
    );

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

  // FIXME: fixear el problema de dots extras en desktop
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
===
import EmblaCarousel, {
  type EmblaCarouselType,
  type EmblaOptionsType,
} from "embla-carousel";
import { cn } from "./utils";

type ClassNames = {
  dot: string;
  dotActive: string;
};

export type SilderProviderOptions = {
  classNames: Partial<ClassNames>;
  sliderOptions: Partial<EmblaOptionsType>;
};

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
  private options: NonNullable<SilderProviderOptions>;

  constructor(
    selector: string | HTMLElement,
    options: Partial<SilderProviderOptions> = {},
  ) {
    const containerEl =
      typeof selector === "string"
        ? document.querySelector<HTMLElement>(selector)
        : selector;
    const dotsContainerEl = document.querySelector<HTMLElement>(
      `${selector}-dots`,
    );

    if (!containerEl) {
      throw new Error(`Container not found`);
    }

    if (!dotsContainerEl) {
      throw new Error(`Dots container not found`);
    }

    this.options = this.mergeOptions(options);
    this.dotsContainerEl = dotsContainerEl;
    this.slider = EmblaCarousel(containerEl, this.options.sliderOptions);
  }

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
        ...DEFAULT_OPTIONS.classNames,
        ...options.classNames,
      },
      sliderOptions: {
        ...DEFAULT_OPTIONS.sliderOptions,
        ...options.sliderOptions,
      },
    };
  };

  /**
   * Construye la cadena de clases CSS para un elemento punto (dot) basada en su estado activo.
   * @param isActive - Indica si el punto actual representa el snap seleccionado.
   * @param selector - La clave del nombre de la clase base.
   * @param activeSelector - La clave del nombre de la clase activa.
   * @returns Las clases CSS combinadas.
   */
  private buildClasses = (
    isActive: boolean,
    selector: keyof ClassNames,
    activeSelector?: keyof ClassNames,
  ) => {
    return cn(
      this.options.classNames?.[selector],
      activeSelector && isActive && this.options.classNames?.[activeSelector],
    );
  };

  /**
   * Filtra las posiciones de desplazamiento (snap) duplicadas.
   * Con `containScroll: "keepSnaps"`, los últimos snaps pueden apuntar a la misma posición visual exacta.
   * Este método asegura que solo generemos puntos para posiciones visuales únicas.
   * @returns Un objeto que contiene los snaps únicos, sus índices originales y la lista completa de snaps.
   */
  private getUniqueSnaps = () => {
    const snapList = this.slider.scrollSnapList();
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
   * Inicializa y renderiza los puntos de paginación dentro del contenedor de puntos.
   * Los elementos se crean dinámicamente basándose en las posiciones de desplazamiento únicas.
   * Oculta el contenedor de puntos por completo si hay 1 o menos snaps únicos disponibles.
   */
  private buildDots = () => {
    this.dotsContainerEl.innerHTML = "";
    const { uniqueSnaps, indexMapping, snapList } = this.getUniqueSnaps();

    // Ocultar container si hay 1 o menos snaps
    if (uniqueSnaps.length <= 1) {
      this.dotsContainerEl.style.display = "none";
      return;
    }

    this.dotsContainerEl.style.display = ""; // Restaurar display original

    const selectedIndex = this.slider.selectedScrollSnap();
    const currentSnap = snapList[selectedIndex];
    const uniqueSelectedIndex = uniqueSnaps.findIndex(
      (s) => Math.abs(s - currentSnap) < 0.1,
    );

    uniqueSnaps.forEach((_, index) => {
      const dot = document.createElement("button");
      const isActive = index === uniqueSelectedIndex;

      dot.className = this.buildClasses(isActive, "dot", "dotActive");
      const targetIndex = indexMapping[index];
      dot.addEventListener("click", () => this.slider.scrollTo(targetIndex));
      this.dotsContainerEl.appendChild(dot);
    });
  };

  /**
   * Actualiza las clases CSS activas de los puntos de paginación cuando el slider cambia de posición.
   */
  private updateDots = () => {
    const { uniqueSnaps, snapList } = this.getUniqueSnaps();
    const selectedIndex = this.slider.selectedScrollSnap();
    const currentSnap = snapList[selectedIndex];
    const uniqueSelectedIndex = uniqueSnaps.findIndex(
      (s) => Math.abs(s - currentSnap) < 0.1,
    );

    this.dotsContainerEl.querySelectorAll("button").forEach((dot, index) => {
      const isActive = index === uniqueSelectedIndex;
      dot.className = this.buildClasses(isActive, "dot", "dotActive");
    });
  };

  /**
   * Se suscribe a los eventos de Embla Carousel y adjunta escuchadores de eventos externos.
   * Configura la sincronización de los puntos de paginación y habilita el desplazamiento personalizado con la rueda del ratón.
   */
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
```
