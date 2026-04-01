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
}
