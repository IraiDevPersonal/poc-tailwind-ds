import type { EmblaOptionsType } from "embla-carousel";

/**
 * Opciones de configuración para el Carousel3DProvider.
 * Combina opciones nativas de Embla con configuración visual del efecto 3D.
 */
export type Carousel3DProviderOptions = {
  emblaOptions: Partial<
    {
      showDots: boolean;
    } & EmblaOptionsType
  >;
  mountOnInit: boolean;
  /**
   * Valor de perspectiva CSS en píxeles.
   * Controla la profundidad del efecto 3D.
   * @default 1200
   */
  perspective: number;
  /**
   * Grados de rotación en el eje Y por cada posición de desplazamiento.
   * @default 25
   */
  rotateYPerStep: number;
  /**
   * Reducción de escala por cada posición de desplazamiento (0-1).
   * @default 0.12
   */
  scalePerStep: number;
  /**
   * Reducción de opacidad por cada posición de desplazamiento (0-1).
   * @default 0.22
   */
  opacityPerStep: number;
};
