import type {
  TransformKeyframe,
  ResponsiveConfig,
  Carousel3DOptions,
} from "./types";
import { VIRTUAL_CYCLES, NAV_CLASS } from "./constants";
import { interpolateKeyframes } from "./utils";

/**
 * Carrusel 3D con efecto de profundidad y desplazamiento virtual infinito.
 * Gestiona la animación de tarjetas con perspectiva, rotación y escala interpoladas
 * mediante keyframes, sin depender de librerías de animación externas.
 *
 * @example
 * const carousel = new Carousel3D(document.getElementById('mi-carousel')!, {
 *   visibleCards: 3,
 *   infinite: true,
 *   showArrows: true,
 *   translateX: 220,
 *   rotateY: 21,
 *   sideScale: 0.8,
 *   onActiveChange: (index) => console.log('Activo:', index),
 * });
 *
 * @note
 * El carrusel utiliza un canvas virtual de `VIRTUAL_CYCLES * cardCount` posiciones
 * para simular desplazamiento infinito sin reciclar nodos DOM. Al destruirlo,
 * restaura el HTML original del contenedor.
 *
 * @param container - Elemento raíz del carrusel. Debe contener los elementos hijos
 * que coincidan con `cardSelector` (por defecto `[data-carousel-card]`).
 *
 * @param options - Configuración opcional del carrusel.
 *
 * Configuraciones por defecto:
 * - `visibleCards`: 3 (o `data-visible-cards` del contenedor).
 * - `infinite`: true (desplazamiento infinito virtual).
 * - `showArrows`: true (botones de navegación visibles).
 * - `showArrowsOnMobile`: true (botones visibles en móvil).
 * - `translateX`: 220 (desplazamiento horizontal de las tarjetas laterales en px).
 * - `rotateY`: 21 (rotación en el eje Y de las tarjetas laterales en grados).
 * - `sideScale`: 0.8 (escala de las tarjetas laterales).
 * - `perspective`: 1050 (perspectiva CSS del contenedor en px).
 */
export class Carousel3DProvider {
  private container: HTMLElement;
  private visibleCards: 3 | 5;
  private infinite: boolean;
  private keyframes: TransformKeyframe[];
  private breakpoints: { minWidth: number; config: ResponsiveConfig }[];
  private onActiveChange?: (index: number) => void;
  private showArrows: boolean;
  private showArrowsOnMobile: boolean;

  // Layout options — single source of truth shared with the placeholder.
  private options!: Carousel3DOptions;
  private translateX: number;
  private rotateY: number;
  private sideScale: number;
  private lgPerspective: number;

  private originalCards: HTMLElement[] = [];
  private cardCount = 0;
  private virtualCount = 0;

  private scrollLayer!: HTMLElement;
  private canvas!: HTMLElement;
  private perspectiveContainer!: HTMLElement;
  private spacerWidth = 0;
  private visualCards: HTMLElement[] = [];
  private prevBtn!: HTMLElement;
  private nextBtn!: HTMLElement;

  private currentResponsive!: ResponsiveConfig;
  private activeIndex = 0;
  private resizeObserver!: ResizeObserver;
  private scrollEndTimer: ReturnType<typeof setTimeout> | null = null;
  private swapTimer: ReturnType<typeof setTimeout> | null = null;
  private savedChildren: Node[] = [];
  private initialized = false;
  private placeholder: HTMLElement | null = null;

  constructor(container: HTMLElement, options: Carousel3DOptions = {}) {
    this.container = container;
    this.visibleCards =
      options.visibleCards ??
      (parseInt(container.dataset.visibleCards || "3", 10) as 3 | 5);
    this.options = options;
    this.infinite = options.infinite ?? true;
    this.onActiveChange = options.onActiveChange;
    this.showArrows = options.showArrows ?? true;
    this.showArrowsOnMobile = options.showArrowsOnMobile ?? true;

    // Layout config
    this.translateX = options.translateX ?? 220;
    this.rotateY = options.rotateY ?? 21;
    this.sideScale = options.sideScale ?? 0.8;
    this.lgPerspective = options.perspective ?? 1050;

    this.keyframes = this.buildKeyframes();
    this.breakpoints = this.buildBreakpoints();

    if (options.placeholderSelector) {
      this.placeholder = document.querySelector(options.placeholderSelector);
    }

    const selector = options.cardSelector || "[data-carousel-card]";
    this.originalCards = Array.from(
      container.querySelectorAll<HTMLElement>(selector),
    );
    this.cardCount = this.originalCards.length;

    if (this.cardCount < 2) return;

    this.virtualCount = this.infinite
      ? this.cardCount * VIRTUAL_CYCLES
      : this.cardCount;

    this.currentResponsive = this.getResponsiveConfig();
    this.savedChildren = Array.from(this.container.childNodes).map((n) =>
      n.cloneNode(true),
    );

    this.buildDOM();
    this.spacerWidth =
      (this.scrollLayer.clientWidth - this.currentResponsive.cardWidth) / 2;
    this.initialPosition();
    this.updateTransforms();

    // Swap after 500ms: placeholder stays visible while real carousel
    // settles, then swap is imperceptible since both show the same layout.
    this.swapTimer = setTimeout(() => {
      this.container.classList.remove(
        "absolute",
        "inset-0",
        "opacity-0",
        "pointer-events-none",
      );
      this.container.classList.add(
        "relative",
        "w-full",
        "select-none",
        "overflow-hidden",
      );
      this.perspectiveContainer.style.visibility = "visible";
      if (this.placeholder) {
        this.placeholder.style.display = "none";
      }
    }, 500);
    this.bindEvents();
    this.initialized = true;
    this.onActiveChange?.(this.activeIndex);
  }

  // ---------------------------------------------------------------------------
  // Layout builders — derive keyframes and breakpoints from the config options.
  // Edit the options (perspective, rotateY, translateX, sideScale) to change
  // the look; these methods ensure the placeholder is always kept in sync.
  // ---------------------------------------------------------------------------

  /**
   * Construye los keyframes de transformación según el modo `visibleCards` seleccionado.
   * Los valores de `translateX`, `rotateY` y `sideScale` de la instancia determinan
   * la apariencia de las tarjetas laterales; las posiciones fantasma se derivan proporcionalmente.
   * @returns Array de keyframes ordenados de izquierda a derecha.
   */
  private buildKeyframes(): TransformKeyframe[] {
    const tx = this.translateX;
    const ry = this.rotateY;
    const sc = this.sideScale;

    if (this.visibleCards === 5) {
      // ±2 ghost cards derived proportionally from the ±1 visible position.
      const ghost1TX = Math.round(tx * 1.73);
      const ghost2TX = Math.round(tx * 2.18);
      return [
        {
          translateX: ghost2TX,
          scale: 0.6,
          rotateY: -25,
          opacity: 0,
          zIndex: 5,
        },
        {
          translateX: ghost1TX,
          scale: 0.7,
          rotateY: -25,
          opacity: 0.6,
          zIndex: 10,
        },
        { translateX: tx, scale: sc, rotateY: -ry, opacity: 1, zIndex: 20 },
        { translateX: 0, scale: 1.0, rotateY: 0, opacity: 1, zIndex: 30 },
        { translateX: -tx, scale: sc, rotateY: ry, opacity: 1, zIndex: 20 },
        {
          translateX: -ghost1TX,
          scale: 0.7,
          rotateY: 25,
          opacity: 0.6,
          zIndex: 10,
        },
        {
          translateX: -ghost2TX,
          scale: 0.6,
          rotateY: 25,
          opacity: 0,
          zIndex: 5,
        },
      ];
    }

    // visibleCards === 3
    const ghostTX = Math.round(tx * 1.45);
    return [
      { translateX: ghostTX, scale: 0.7, rotateY: -25, opacity: 0, zIndex: 5 },
      { translateX: tx, scale: sc, rotateY: -ry, opacity: 1, zIndex: 20 },
      { translateX: 0, scale: 1.0, rotateY: 0, opacity: 1, zIndex: 30 },
      { translateX: -tx, scale: sc, rotateY: ry, opacity: 1, zIndex: 20 },
      { translateX: -ghostTX, scale: 0.7, rotateY: 25, opacity: 0, zIndex: 5 },
    ];
  }

  /**
   * Construye la lista de breakpoints responsivos a partir de las opciones.
   * Si el usuario no proporcionó breakpoints explícitos, se genera uno único
   * con `minWidth: 0` que aplica a cualquier ancho de pantalla.
   * @returns Array de breakpoints ordenados de mayor a menor `minWidth`.
   */
  private buildBreakpoints(): { minWidth: number; config: ResponsiveConfig }[] {
    // Si el usuario pasó breakpoints explícitos, usarlos directamente.
    if (this.options.breakpoints?.length) {
      return this.options.breakpoints;
    }

    // Sin breakpoints: un único BP (minWidth: 0) que aplica a cualquier ancho.
    const defaults: ResponsiveConfig = {
      cardWidth: 275,
      cardHeight: 271,
      containerHeight: 420,
      perspective: this.lgPerspective,
      transformScale: 1.0,
    };

    return [
      {
        minWidth: 0,
        config: {
          ...defaults,
          ...(this.options.layout ?? {}),
          perspective: this.lgPerspective, // siempre respeta la opción top-level
        },
      },
    ];
  }

  // ---------------------------------------------------------------------------

  /**
   * Posición de scroll ajustada por el spacer izquierdo.
   * Un valor de 0 equivale a la primera tarjeta virtual centrada en pantalla.
   */
  private get scrollOffset(): number {
    return this.scrollLayer.scrollLeft - this.spacerWidth;
  }

  /**
   * Determina la configuración responsiva activa según el ancho actual del contenedor.
   * Recorre los breakpoints de mayor a menor y devuelve el primero cuyo `minWidth`
   * sea menor o igual al ancho del contenedor.
   * @returns La configuración `ResponsiveConfig` correspondiente al breakpoint activo.
   */
  private getResponsiveConfig(): ResponsiveConfig {
    const width = this.container.offsetWidth;
    for (const bp of this.breakpoints) {
      if (width >= bp.minWidth) return bp.config;
    }
    return this.breakpoints[this.breakpoints.length - 1].config;
  }

  /**
   * Construye y monta toda la estructura DOM del carrusel dentro del contenedor raíz.
   * Crea la capa de perspectiva, las tarjetas visuales (clones de los hijos originales),
   * el canvas de scroll virtual y los botones de navegación.
   * Vacía el contenedor antes de insertar los nuevos elementos.
   */
  private buildDOM(): void {
    const rc = this.currentResponsive;

    this.perspectiveContainer = document.createElement("div");
    this.perspectiveContainer.className =
      "relative flex-1 flex items-center justify-center overflow-visible";
    this.perspectiveContainer.style.perspective = `${rc.perspective}px`;
    this.perspectiveContainer.style.height = `${rc.containerHeight}px`;
    this.perspectiveContainer.style.visibility = "hidden";

    const visualLayer = document.createElement("div");
    visualLayer.className =
      "absolute inset-0 flex items-center justify-center pointer-events-none [transform-style:preserve-3d]";

    for (let i = 0; i < this.cardCount; i++) {
      const card = document.createElement("div");
      card.className =
        "absolute [transform-style:preserve-3d] [will-change:transform,opacity] transition-[transform,opacity] duration-[50ms] ease-linear cursor-pointer rounded-[25px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15),0_5px_15px_rgba(0,0,0,0.08)]";
      card.style.width = `${rc.cardWidth}px`;
      card.style.height = `${rc.cardHeight}px`;
      card.dataset.realIndex = String(i);
      card.dataset.c3dCard = "";

      const inner = this.originalCards[i].cloneNode(true) as HTMLElement;
      card.appendChild(inner);
      visualLayer.appendChild(card);
      this.visualCards.push(card);
    }

    // Scroll layer: spacer + canvas + spacer (3 DOM elements).
    this.scrollLayer = document.createElement("div");
    this.scrollLayer.className =
      "absolute inset-0 z-[35] flex overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none]";
    this.scrollLayer.dataset.c3dScroll = "";

    const spacerLeft = document.createElement("div");
    spacerLeft.className = "shrink-0";
    spacerLeft.dataset.c3dSpacer = "";
    spacerLeft.style.minWidth = `calc(50% - ${rc.cardWidth / 2}px)`;

    const totalVirtualWidth = this.virtualCount * rc.cardWidth;
    this.canvas = document.createElement("div");
    this.canvas.className = "shrink-0 h-px";
    this.canvas.style.width = `${totalVirtualWidth}px`;
    this.canvas.style.minWidth = `${totalVirtualWidth}px`;

    const spacerRight = document.createElement("div");
    spacerRight.className = "shrink-0";
    spacerRight.dataset.c3dSpacer = "";
    spacerRight.style.minWidth = `calc(50% - ${rc.cardWidth / 2}px)`;

    this.scrollLayer.appendChild(spacerLeft);
    this.scrollLayer.appendChild(this.canvas);
    this.scrollLayer.appendChild(spacerRight);

    this.perspectiveContainer.appendChild(visualLayer);
    this.perspectiveContainer.appendChild(this.scrollLayer);

    // Nav buttons
    this.prevBtn = document.createElement("button");
    this.prevBtn.className = NAV_CLASS;
    this.prevBtn.setAttribute("aria-label", "Previous");
    this.prevBtn.innerHTML = `<svg width="24" height="24" class="max-sm:w-[18px] max-sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;

    this.nextBtn = document.createElement("button");
    this.nextBtn.className = NAV_CLASS;
    this.nextBtn.setAttribute("aria-label", "Next");
    this.nextBtn.innerHTML = `<svg width="24" height="24" class="max-sm:w-[18px] max-sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    if (!this.showArrows) {
      this.prevBtn.style.display = "none";
      this.nextBtn.style.display = "none";
    } else if (!this.showArrowsOnMobile) {
      this.prevBtn.classList.add("max-sm:hidden");
      this.nextBtn.classList.add("max-sm:hidden");
    }

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "relative flex items-center";
    wrapper.appendChild(this.prevBtn);
    wrapper.appendChild(this.perspectiveContainer);
    wrapper.appendChild(this.nextBtn);

    this.container.appendChild(wrapper);
  }

  /**
   * Desplaza el scroll layer hasta la posición del índice virtual indicado.
   * @param index - Índice virtual de la tarjeta a centrar.
   * @param behavior - Comportamiento del scroll (`"auto"` o `"smooth"`). Por defecto `"auto"`.
   */
  private scrollToVirtual(
    index: number,
    behavior: ScrollBehavior = "auto",
  ): void {
    this.scrollLayer.scrollTo({
      left: this.spacerWidth + index * this.currentResponsive.cardWidth,
      behavior,
    });
  }

  /**
   * Establece la posición inicial del scroll.
   * En modo infinito, centra en la mitad del canvas virtual alineada con el índice 0.
   * En modo finito, centra en la tarjeta del medio del conjunto real.
   */
  private initialPosition(): void {
    if (this.infinite) {
      const middleVirtual = Math.floor(this.virtualCount / 2);
      const startVirtual = middleVirtual - (middleVirtual % this.cardCount);
      this.scrollToVirtual(startVirtual);
      this.activeIndex = 0;
    } else {
      const startIndex = Math.floor(this.cardCount / 2);
      this.scrollToVirtual(startIndex);
      this.activeIndex = startIndex;
    }
  }

  /**
   * Suscribe todos los event listeners necesarios para el funcionamiento del carrusel:
   * scroll, click en botones prev/next, click en tarjetas y ResizeObserver.
   */
  private bindEvents(): void {
    this.scrollLayer.addEventListener("scroll", this.handleScroll, {
      passive: true,
    });

    this.prevBtn.addEventListener("click", () => {
      this.scrollLayer.scrollBy({
        left: -this.currentResponsive.cardWidth,
        behavior: "smooth",
      });
    });

    this.nextBtn.addEventListener("click", () => {
      this.scrollLayer.scrollBy({
        left: this.currentResponsive.cardWidth,
        behavior: "smooth",
      });
    });

    this.scrollLayer.addEventListener("click", this.handleCardClick);

    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);
  }

  /**
   * Manejador del evento `scroll`. Actualiza las transformaciones de las tarjetas
   * y programa un temporizador para ejecutar la lógica de snap al terminar el scroll.
   */
  private handleScroll = (): void => {
    this.updateTransforms();

    if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);
    this.scrollEndTimer = setTimeout(() => {
      this.handleScrollEnd();
    }, 100);
  };

  /**
   * Ejecuta el snap al terminar el scroll: ajusta la posición a la tarjeta más cercana
   * y actualiza `activeIndex` si cambió, disparando el callback `onActiveChange`.
   */
  private handleScrollEnd(): void {
    const rc = this.currentResponsive;
    const offset = this.scrollOffset;
    const rawIndex = Math.round(offset / rc.cardWidth);

    // JS-based snap: scroll to the nearest card-aligned position
    this.scrollToVirtual(rawIndex, "smooth");

    let newActive: number;
    if (this.infinite) {
      newActive =
        ((rawIndex % this.cardCount) + this.cardCount) % this.cardCount;
    } else {
      newActive = Math.max(0, Math.min(rawIndex, this.cardCount - 1));
    }

    if (newActive !== this.activeIndex) {
      this.activeIndex = newActive;
      this.onActiveChange?.(this.activeIndex);
    }
  }

  /**
   * Manejador de click sobre el scroll layer. Detecta la tarjeta visual clicada
   * usando `elementFromPoint` (con `pointerEvents` temporalmente desactivados en el layer)
   * y desplaza el carrusel hacia ella si no es la tarjeta central.
   */
  private handleCardClick = (e: MouseEvent): void => {
    const rc = this.currentResponsive;
    const centerVirtual = Math.round(this.scrollOffset / rc.cardWidth);

    this.scrollLayer.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY);
    this.scrollLayer.style.pointerEvents = "";

    const target = (el as HTMLElement | null)?.closest(
      "[data-c3d-card]",
    ) as HTMLElement | null;
    if (!target) return;

    const cardIdx = this.visualCards.indexOf(target);
    if (cardIdx === -1) return;

    if (this.infinite) {
      const centerReal =
        ((centerVirtual % this.cardCount) + this.cardCount) % this.cardCount;
      let diff = cardIdx - centerReal;
      if (diff > this.cardCount / 2) diff -= this.cardCount;
      if (diff < -this.cardCount / 2) diff += this.cardCount;
      if (diff === 0) return;
      this.scrollLayer.scrollBy({
        left: diff * rc.cardWidth,
        behavior: "smooth",
      });
    } else {
      if (cardIdx === centerVirtual) return;
      const diff = cardIdx - centerVirtual;
      this.scrollLayer.scrollBy({
        left: diff * rc.cardWidth,
        behavior: "smooth",
      });
    }
  };

  /**
   * Recalcula y aplica las transformaciones CSS (`translateX`, `scale`, `rotateY`, `opacity`, `zIndex`)
   * a cada tarjeta visual según su distancia al centro actual del scroll.
   * Las tarjetas fuera del rango visible se ocultan y desactivan su `pointerEvents`.
   */
  private updateTransforms(): void {
    const rc = this.currentResponsive;
    const centerFloat = this.scrollOffset / rc.cardWidth;
    const maxRange = (this.keyframes.length - 1) / 2 + 1;

    if (this.infinite) {
      const fractionalCenter = centerFloat % this.cardCount;

      for (let i = 0; i < this.cardCount; i++) {
        const card = this.visualCards[i];
        let dist = fractionalCenter - i;

        if (dist > this.cardCount / 2) dist -= this.cardCount;
        if (dist < -this.cardCount / 2) dist += this.cardCount;

        if (Math.abs(dist) > maxRange) {
          card.style.opacity = "0";
          card.style.zIndex = "0";
          card.style.pointerEvents = "none";
          continue;
        }

        const vals = interpolateKeyframes(
          this.keyframes,
          dist,
          rc.transformScale,
        );
        card.style.transform = `translateX(${vals.translateX}px) scale(${vals.scale}) rotateY(${vals.rotateY}deg)`;
        card.style.opacity = String(Math.max(0, Math.min(1, vals.opacity)));
        card.style.zIndex = String(vals.zIndex);
        card.style.pointerEvents = vals.opacity > 0.1 ? "auto" : "none";
      }
    } else {
      for (let i = 0; i < this.visualCards.length; i++) {
        const card = this.visualCards[i];
        const position = centerFloat - i;

        if (Math.abs(position) > maxRange) {
          card.style.opacity = "0";
          card.style.zIndex = "0";
          card.style.pointerEvents = "none";
          continue;
        }

        const vals = interpolateKeyframes(
          this.keyframes,
          position,
          rc.transformScale,
        );
        card.style.transform = `translateX(${vals.translateX}px) scale(${vals.scale}) rotateY(${vals.rotateY}deg)`;
        card.style.opacity = String(Math.max(0, Math.min(1, vals.opacity)));
        card.style.zIndex = String(vals.zIndex);
        card.style.pointerEvents = vals.opacity > 0.1 ? "auto" : "none";
      }
    }
  }

  /**
   * Responde a cambios de tamaño del contenedor detectados por `ResizeObserver`.
   * Actualiza la configuración responsiva activa, redimensiona tarjetas y canvas,
   * recalcula el spacer y mantiene la posición de scroll proporcional al nuevo `cardWidth`.
   */
  private handleResize(): void {
    const newConfig = this.getResponsiveConfig();
    const oldCardWidth = this.currentResponsive.cardWidth;
    this.currentResponsive = newConfig;

    this.perspectiveContainer.style.perspective = `${newConfig.perspective}px`;
    this.perspectiveContainer.style.height = `${newConfig.containerHeight}px`;

    for (const card of this.visualCards) {
      card.style.width = `${newConfig.cardWidth}px`;
      card.style.height = `${newConfig.cardHeight}px`;
    }

    // Update canvas and spacers
    const totalVirtualWidth = this.virtualCount * newConfig.cardWidth;
    this.canvas.style.width = `${totalVirtualWidth}px`;
    this.canvas.style.minWidth = `${totalVirtualWidth}px`;
    const spacers =
      this.scrollLayer.querySelectorAll<HTMLElement>("[data-c3d-spacer]");
    for (const spacer of spacers) {
      spacer.style.minWidth = `calc(50% - ${newConfig.cardWidth / 2}px)`;
    }

    // Recalculate spacer width and maintain position
    this.spacerWidth = (this.scrollLayer.clientWidth - newConfig.cardWidth) / 2;
    const virtualIndex = this.scrollOffset / oldCardWidth;
    this.scrollToVirtual(Math.round(virtualIndex));

    this.updateTransforms();
  }

  /**
   * Retorna el índice real de la tarjeta actualmente centrada en el carrusel.
   * @returns Índice entre `0` y `cardCount - 1`.
   */
  getActiveIndex(): number {
    return this.activeIndex;
  }

  /**
   * Desplaza el carrusel hasta la tarjeta con el índice real indicado.
   * En modo infinito calcula el camino más corto para evitar giros innecesarios.
   * @param index - Índice real de la tarjeta destino. Se limita al rango `[0, cardCount - 1]`.
   */
  goTo(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.cardCount - 1));
    const rc = this.currentResponsive;

    if (this.infinite) {
      const currentVirtual = Math.round(this.scrollOffset / rc.cardWidth);
      const currentReal =
        ((currentVirtual % this.cardCount) + this.cardCount) % this.cardCount;
      let diff = clamped - currentReal;
      if (diff > this.cardCount / 2) diff -= this.cardCount;
      if (diff < -this.cardCount / 2) diff += this.cardCount;
      this.scrollToVirtual(currentVirtual + diff, "smooth");
    } else {
      this.scrollToVirtual(clamped, "smooth");
    }
  }

  /**
   * Desmonta el carrusel y restaura el contenido HTML original del contenedor.
   * Elimina todos los event listeners, desconecta el `ResizeObserver` y limpia
   * los timers pendientes. No tiene efecto si el carrusel no fue inicializado.
   */
  destroy(): void {
    if (!this.initialized) return;

    this.resizeObserver.disconnect();
    this.scrollLayer.removeEventListener("scroll", this.handleScroll);
    this.scrollLayer.removeEventListener("click", this.handleCardClick);
    if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);
    if (this.swapTimer) clearTimeout(this.swapTimer);

    this.container.classList.remove(
      "relative",
      "w-full",
      "select-none",
      "overflow-hidden",
    );
    this.container.classList.add(
      "absolute",
      "inset-0",
      "opacity-0",
      "pointer-events-none",
    );
    this.container.innerHTML = "";
    for (const child of this.savedChildren) {
      this.container.appendChild(child.cloneNode(true));
    }
    this.visualCards = [];
    this.initialized = false;
  }
}
