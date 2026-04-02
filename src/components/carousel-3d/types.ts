export interface TransformKeyframe {
  translateX: number;
  scale: number;
  rotateY: number;
  opacity: number;
  zIndex: number;
}

export interface ResponsiveConfig {
  cardWidth: number;
  cardHeight: number;
  containerHeight: number;
  perspective: number;
  transformScale: number;
}

export interface Carousel3DOptions {
  visibleCards?: 3 | 5;
  infinite?: boolean;
  showArrows?: boolean;
  showArrowsOnMobile?: boolean;
  placeholderSelector?: string;
  onActiveChange?: (index: number) => void;
  cardSelector?: string;
  /**
   * Perspective (px) aplicada al contenedor en el breakpoint lg (≥1024px).
   * Los breakpoints sm y base escalan proporcionalmente.
   * @default 1050
   */
  perspective?: number;
  /**
   * Rotación en grados de las cards laterales (±1 respecto al centro).
   * @default 21
   */
  rotateY?: number;
  /**
   * Separación en px entre la card central y las cards laterales en lg.
   * Los breakpoints inferiores escalan según transformScale.
   * @default 220
   */
  translateX?: number;
  /**
   * Escala visual de las cards laterales (±1 respecto al centro).
   * @default 0.8
   */
  sideScale?: number;
}
