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
   * Perspectiva (px) del contenedor en el layout por defecto.
   * Ignorada cuando se provee `breakpoints` (en ese caso va dentro de cada config).
   * @default 1050
   */
  perspective?: number;
  /**
   * Rotación en grados de las cards laterales (±1 respecto al centro).
   * @default 21
   */
  rotateY?: number;
  /**
   * Separación en px entre la card central y las laterales.
   * Se multiplica por `transformScale` del breakpoint activo.
   * @default 220
   */
  translateX?: number;
  /**
   * Escala visual de las cards laterales (±1 respecto al centro).
   * @default 0.8
   */
  sideScale?: number;
  /**
   * Dimensiones de la card y el contenedor para el layout por defecto (sin responsive).
   * Ignorada cuando se provee `breakpoints`.
   * @default { cardWidth: 275, cardHeight: 271, containerHeight: 420 }
   */
  layout?: {
    cardWidth?: number;
    cardHeight?: number;
    containerHeight?: number;
  };
  /**
   * Breakpoints responsivos completos. Cuando se provee, reemplaza por completo
   * el layout por defecto (`layout` y `perspective` top-level se ignoran).
   * Ordenar de mayor a menor minWidth.
   *
   * @example
   * breakpoints: [
   *   { minWidth: 1024, config: { cardWidth: 260, cardHeight: 340, containerHeight: 420, perspective: 1050, transformScale: 1.0  } },
   *   { minWidth: 640,  config: { cardWidth: 220, cardHeight: 290, containerHeight: 360, perspective: 800,  transformScale: 0.85 } },
   *   { minWidth: 0,    config: { cardWidth: 200, cardHeight: 260, containerHeight: 320, perspective: 600,  transformScale: 0.7  } },
   * ]
   */
  breakpoints?: Array<{ minWidth: number; config: ResponsiveConfig }>;
}
