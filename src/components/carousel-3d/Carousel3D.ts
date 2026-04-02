import type { TransformKeyframe, ResponsiveConfig, Carousel3DOptions } from './types';

const KEYFRAMES_5: TransformKeyframe[] = [
  { translateX: 480, scale: 0.6, rotateY: -25, opacity: 0, zIndex: 5 },
  { translateX: 380, scale: 0.7, rotateY: -25, opacity: 0.6, zIndex: 10 },
  { translateX: 220, scale: 0.8, rotateY: -21, opacity: 1, zIndex: 20 },
  { translateX: 0, scale: 1.0, rotateY: 0, opacity: 1, zIndex: 30 },
  { translateX: -220, scale: 0.8, rotateY: 21, opacity: 1, zIndex: 20 },
  { translateX: -380, scale: 0.7, rotateY: 25, opacity: 0.6, zIndex: 10 },
  { translateX: -480, scale: 0.6, rotateY: 25, opacity: 0, zIndex: 5 },
];

const KEYFRAMES_3: TransformKeyframe[] = [
  { translateX: 320, scale: 0.7, rotateY: -25, opacity: 0, zIndex: 5 },
  { translateX: 220, scale: 0.8, rotateY: -21, opacity: 1, zIndex: 20 },
  { translateX: 0, scale: 1.0, rotateY: 0, opacity: 1, zIndex: 30 },
  { translateX: -220, scale: 0.8, rotateY: 21, opacity: 1, zIndex: 20 },
  { translateX: -320, scale: 0.7, rotateY: 25, opacity: 0, zIndex: 5 },
];

const BREAKPOINTS: { minWidth: number; config: ResponsiveConfig }[] = [
  { minWidth: 1024, config: { cardWidth: 260, cardHeight: 340, containerHeight: 420, perspective: 1050, transformScale: 1.0 } },
  { minWidth: 640, config: { cardWidth: 220, cardHeight: 290, containerHeight: 360, perspective: 800, transformScale: 0.85 } },
  { minWidth: 0, config: { cardWidth: 200, cardHeight: 260, containerHeight: 320, perspective: 600, transformScale: 0.7 } },
];

// Virtual cycles: the canvas is sized to this many repetitions of all cards.
// User would need to scroll ~650 cards in one direction to reach the edge.
const VIRTUAL_CYCLES = 100;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateKeyframes(
  keyframes: TransformKeyframe[],
  position: number,
  transformScale: number,
): { translateX: number; scale: number; rotateY: number; opacity: number; zIndex: number } {
  const half = (keyframes.length - 1) / 2;
  const normalized = position + half;

  if (normalized <= 0) return { ...keyframes[0], translateX: keyframes[0].translateX * transformScale };
  if (normalized >= keyframes.length - 1) {
    const last = keyframes[keyframes.length - 1];
    return { ...last, translateX: last.translateX * transformScale };
  }

  const idx = Math.floor(normalized);
  const t = normalized - idx;
  const a = keyframes[idx];
  const b = keyframes[Math.min(idx + 1, keyframes.length - 1)];

  return {
    translateX: lerp(a.translateX, b.translateX, t) * transformScale,
    scale: lerp(a.scale, b.scale, t),
    rotateY: lerp(a.rotateY, b.rotateY, t),
    opacity: lerp(a.opacity, b.opacity, t),
    zIndex: Math.round(lerp(a.zIndex, b.zIndex, t)),
  };
}

export class Carousel3D {
  private container: HTMLElement;
  private visibleCards: 3 | 5;
  private infinite: boolean;
  private keyframes: TransformKeyframe[];
  private onActiveChange?: (index: number) => void;
  private showArrows: boolean;
  private showArrowsOnMobile: boolean;

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
    this.visibleCards = options.visibleCards
      ?? (parseInt(container.dataset.visibleCards || '3', 10) as 3 | 5);
    this.infinite = options.infinite ?? true;
    this.keyframes = this.visibleCards === 5 ? KEYFRAMES_5 : KEYFRAMES_3;
    this.onActiveChange = options.onActiveChange;
    this.showArrows = options.showArrows ?? true;
    this.showArrowsOnMobile = options.showArrowsOnMobile ?? true;

    if (options.placeholderSelector) {
      this.placeholder = document.querySelector(options.placeholderSelector);
    }

    const selector = options.cardSelector || '[data-carousel-card]';
    this.originalCards = Array.from(container.querySelectorAll<HTMLElement>(selector));
    this.cardCount = this.originalCards.length;

    if (this.cardCount < 2) return;

    this.virtualCount = this.infinite
      ? this.cardCount * VIRTUAL_CYCLES
      : this.cardCount;

    this.currentResponsive = this.getResponsiveConfig();
    this.savedChildren = Array.from(this.container.childNodes).map(n => n.cloneNode(true));

    this.buildDOM();
    this.spacerWidth = (this.scrollLayer.clientWidth - this.currentResponsive.cardWidth) / 2;
    this.initialPosition();
    this.updateTransforms();

    // Swap after 500ms: placeholder stays visible while real carousel
    // settles, then swap is imperceptible since both show the same layout.
    this.swapTimer = setTimeout(() => {
      this.container.classList.remove('c3d-real-hidden');
      this.perspectiveContainer.style.visibility = 'visible';
      if (this.placeholder) {
        this.placeholder.style.display = 'none';
      }
    }, 500);
    this.bindEvents();
    this.initialized = true;
    this.onActiveChange?.(this.activeIndex);
  }

  /** Scroll position adjusted for the left spacer — 0 = first virtual card centered */
  private get scrollOffset(): number {
    return this.scrollLayer.scrollLeft - this.spacerWidth;
  }

  private getResponsiveConfig(): ResponsiveConfig {
    const width = this.container.offsetWidth;
    for (const bp of BREAKPOINTS) {
      if (width >= bp.minWidth) return bp.config;
    }
    return BREAKPOINTS[BREAKPOINTS.length - 1].config;
  }

  private buildDOM(): void {
    this.container.classList.add('c3d');
    const rc = this.currentResponsive;

    this.perspectiveContainer = document.createElement('div');
    this.perspectiveContainer.className = 'c3d-perspective';
    this.perspectiveContainer.style.perspective = `${rc.perspective}px`;
    this.perspectiveContainer.style.height = `${rc.containerHeight}px`;
    this.perspectiveContainer.style.visibility = 'hidden';

    const visualLayer = document.createElement('div');
    visualLayer.className = 'c3d-visual-layer';

    for (let i = 0; i < this.cardCount; i++) {
      const card = document.createElement('div');
      card.className = 'c3d-card';
      card.style.width = `${rc.cardWidth}px`;
      card.style.height = `${rc.cardHeight}px`;
      card.dataset.realIndex = String(i);

      const inner = this.originalCards[i].cloneNode(true) as HTMLElement;
      inner.classList.add('c3d-card-inner');
      card.appendChild(inner);
      visualLayer.appendChild(card);
      this.visualCards.push(card);
    }

    // Scroll layer: spacer + canvas + spacer (3 DOM elements).
    this.scrollLayer = document.createElement('div');
    this.scrollLayer.className = 'c3d-scroll';

    const spacerLeft = document.createElement('div');
    spacerLeft.className = 'c3d-spacer';
    spacerLeft.style.minWidth = `calc(50% - ${rc.cardWidth / 2}px)`;

    const totalVirtualWidth = this.virtualCount * rc.cardWidth;
    this.canvas = document.createElement('div');
    this.canvas.className = 'c3d-canvas';
    this.canvas.style.width = `${totalVirtualWidth}px`;
    this.canvas.style.minWidth = `${totalVirtualWidth}px`;

    const spacerRight = document.createElement('div');
    spacerRight.className = 'c3d-spacer';
    spacerRight.style.minWidth = `calc(50% - ${rc.cardWidth / 2}px)`;

    this.scrollLayer.appendChild(spacerLeft);
    this.scrollLayer.appendChild(this.canvas);
    this.scrollLayer.appendChild(spacerRight);

    this.perspectiveContainer.appendChild(visualLayer);
    this.perspectiveContainer.appendChild(this.scrollLayer);

    // Nav buttons
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'c3d-nav c3d-nav-prev';
    this.prevBtn.setAttribute('aria-label', 'Previous');
    this.prevBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;

    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'c3d-nav c3d-nav-next';
    this.nextBtn.setAttribute('aria-label', 'Next');
    this.nextBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    if (!this.showArrows) {
      this.prevBtn.style.display = 'none';
      this.nextBtn.style.display = 'none';
    } else if (!this.showArrowsOnMobile) {
      this.prevBtn.classList.add('c3d-nav-hide-mobile');
      this.nextBtn.classList.add('c3d-nav-hide-mobile');
    }

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'c3d-wrapper';
    wrapper.appendChild(this.prevBtn);
    wrapper.appendChild(this.perspectiveContainer);
    wrapper.appendChild(this.nextBtn);

    this.container.appendChild(wrapper);
  }

  private scrollToVirtual(index: number, behavior: ScrollBehavior = 'auto'): void {
    this.scrollLayer.scrollTo({
      left: this.spacerWidth + index * this.currentResponsive.cardWidth,
      behavior,
    });
  }

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

  private bindEvents(): void {
    this.scrollLayer.addEventListener('scroll', this.handleScroll, { passive: true });

    this.prevBtn.addEventListener('click', () => {
      this.scrollLayer.scrollBy({ left: -this.currentResponsive.cardWidth, behavior: 'smooth' });
    });

    this.nextBtn.addEventListener('click', () => {
      this.scrollLayer.scrollBy({ left: this.currentResponsive.cardWidth, behavior: 'smooth' });
    });

    this.scrollLayer.addEventListener('click', this.handleCardClick);

    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);
  }

  private handleScroll = (): void => {
    this.updateTransforms();

    if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);
    this.scrollEndTimer = setTimeout(() => {
      this.handleScrollEnd();
    }, 100);
  };

  private handleScrollEnd(): void {
    const rc = this.currentResponsive;
    const offset = this.scrollOffset;
    const rawIndex = Math.round(offset / rc.cardWidth);

    // JS-based snap: scroll to the nearest card-aligned position
    this.scrollToVirtual(rawIndex, 'smooth');

    let newActive: number;
    if (this.infinite) {
      newActive = ((rawIndex % this.cardCount) + this.cardCount) % this.cardCount;
    } else {
      newActive = Math.max(0, Math.min(rawIndex, this.cardCount - 1));
    }

    if (newActive !== this.activeIndex) {
      this.activeIndex = newActive;
      this.onActiveChange?.(this.activeIndex);
    }
  }

  private handleCardClick = (e: MouseEvent): void => {
    const rc = this.currentResponsive;
    const centerVirtual = Math.round(this.scrollOffset / rc.cardWidth);

    this.scrollLayer.style.pointerEvents = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    this.scrollLayer.style.pointerEvents = '';

    const target = (el as HTMLElement | null)?.closest('.c3d-card') as HTMLElement | null;
    if (!target) return;

    const cardIdx = this.visualCards.indexOf(target);
    if (cardIdx === -1) return;

    if (this.infinite) {
      const centerReal = ((centerVirtual % this.cardCount) + this.cardCount) % this.cardCount;
      let diff = cardIdx - centerReal;
      if (diff > this.cardCount / 2) diff -= this.cardCount;
      if (diff < -this.cardCount / 2) diff += this.cardCount;
      if (diff === 0) return;
      this.scrollLayer.scrollBy({ left: diff * rc.cardWidth, behavior: 'smooth' });
    } else {
      if (cardIdx === centerVirtual) return;
      const diff = cardIdx - centerVirtual;
      this.scrollLayer.scrollBy({ left: diff * rc.cardWidth, behavior: 'smooth' });
    }
  };

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
          card.style.opacity = '0';
          card.style.zIndex = '0';
          card.style.pointerEvents = 'none';
          continue;
        }

        const vals = interpolateKeyframes(this.keyframes, dist, rc.transformScale);
        card.style.transform = `translateX(${vals.translateX}px) scale(${vals.scale}) rotateY(${vals.rotateY}deg)`;
        card.style.opacity = String(Math.max(0, Math.min(1, vals.opacity)));
        card.style.zIndex = String(vals.zIndex);
        card.style.pointerEvents = vals.opacity > 0.1 ? 'auto' : 'none';
      }
    } else {
      for (let i = 0; i < this.visualCards.length; i++) {
        const card = this.visualCards[i];
        const position = centerFloat - i;

        if (Math.abs(position) > maxRange) {
          card.style.opacity = '0';
          card.style.zIndex = '0';
          card.style.pointerEvents = 'none';
          continue;
        }

        const vals = interpolateKeyframes(this.keyframes, position, rc.transformScale);
        card.style.transform = `translateX(${vals.translateX}px) scale(${vals.scale}) rotateY(${vals.rotateY}deg)`;
        card.style.opacity = String(Math.max(0, Math.min(1, vals.opacity)));
        card.style.zIndex = String(vals.zIndex);
        card.style.pointerEvents = vals.opacity > 0.1 ? 'auto' : 'none';
      }
    }
  }

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
    const spacers = this.scrollLayer.querySelectorAll<HTMLElement>('.c3d-spacer');
    for (const spacer of spacers) {
      spacer.style.minWidth = `calc(50% - ${newConfig.cardWidth / 2}px)`;
    }

    // Recalculate spacer width and maintain position
    this.spacerWidth = (this.scrollLayer.clientWidth - newConfig.cardWidth) / 2;
    const virtualIndex = this.scrollOffset / oldCardWidth;
    this.scrollToVirtual(Math.round(virtualIndex));

    this.updateTransforms();
  }

  getActiveIndex(): number {
    return this.activeIndex;
  }

  goTo(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.cardCount - 1));
    const rc = this.currentResponsive;

    if (this.infinite) {
      const currentVirtual = Math.round(this.scrollOffset / rc.cardWidth);
      const currentReal = ((currentVirtual % this.cardCount) + this.cardCount) % this.cardCount;
      let diff = clamped - currentReal;
      if (diff > this.cardCount / 2) diff -= this.cardCount;
      if (diff < -this.cardCount / 2) diff += this.cardCount;
      this.scrollToVirtual(currentVirtual + diff, 'smooth');
    } else {
      this.scrollToVirtual(clamped, 'smooth');
    }
  }

  destroy(): void {
    if (!this.initialized) return;

    this.resizeObserver.disconnect();
    this.scrollLayer.removeEventListener('scroll', this.handleScroll);
    this.scrollLayer.removeEventListener('click', this.handleCardClick);
    if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);
    if (this.swapTimer) clearTimeout(this.swapTimer);

    this.container.classList.remove('c3d');
    this.container.innerHTML = '';
    for (const child of this.savedChildren) {
      this.container.appendChild(child.cloneNode(true));
    }
    this.visualCards = [];
    this.initialized = false;
  }
}
