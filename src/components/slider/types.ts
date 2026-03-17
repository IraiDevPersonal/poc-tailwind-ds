import type { EmblaOptionsType } from "embla-carousel";

/**
 * Representa la información de los puntos de anclaje (snaps) únicos del slider.
 * Se utiliza para evitar la duplicación de puntos de paginación en los extremos.
 *
 * @property {number[]} uniqueSnaps - Lista de posiciones de desplazamiento únicas.
 * @property {number[]} indexMapping - Mapeo de índices únicos a los índices reales de Embla.
 * @property {number[]} snapList - Lista completa de todos los snaps generados por Embla.
 */
export type SliderUniqueSnaps = {
  uniqueSnaps: number[];
  indexMapping: number[];
  snapList: number[];
};

/**
 * Define los nombres de las clases CSS utilizadas para los elementos de paginación.
 *
 * @property {string} dot - Clase base para el punto de paginación.
 * @property {string} dotActive - Clase para el punto de paginación activo.
 */
export type SliderClassNames = {
  dot: string;
  dotActive: string;
};

/**
 * Opciones de configuración para el SliderProvider.
 * Combina la lógica personalizada con las opciones nativas de Embla Carousel v8.6.
 *
 * @property {Partial<SliderClassNames>} classNames - Clases CSS personalizadas para los componentes del slider.
 * @property {Partial<{ showPagination: boolean } & EmblaOptionsType>} sliderOptions - Opciones de configuración para el motor y lógica de paginación.
 * @property {boolean} [sliderOptions.showPagination] - Lógica propia: Indica si se deben gestionar los puntos de paginación.
 * @property {boolean} [mountOnInit] - Indica si el slider debe montarse automáticamente al instanciar la clase (true por defecto).
 *
 * @see https://www.embla-carousel.com/docs/api/options/
 *
 * Algunas opciones clave de Embla v8.6:
 * - `align`: Alineación de las tarjetas ('start', 'center', 'end' o un número/porcentaje).
 * - `axis`: Eje del scroll ('x' o 'y').
 * - `breakpoints`: Configuración responsiva basada en media queries.
 * - `containScroll`: Limpia espacios vacíos al inicio/final ('trimSnaps', 'keepSnaps', false).
 * - `dragFree`: Permite arrastrar libremente sin anclarse estrictamente a una tarjeta.
 * - `direction`: Dirección del contenido ('ltr' o 'rtl').
 * - `loop`: Habilita el desplazamiento infinito.
 * - `skipSnaps`: Permite saltar múltiples tarjetas en movimientos rápidos (flicks). Evita el rebote.
 * - `slidesToScroll`: Cuántas tarjetas desplazar en cada movimiento (número o 'auto').
 * - `startIndex`: Índice de la tarjeta inicial (0 por defecto).
 * - `watchDrag`: Habilita o deshabilita la posibilidad de arrastrar con el mouse o touch.
 */
export type SilderProviderOptions = {
  classNames: Partial<SliderClassNames>;
  sliderOptions: Partial<{ showDots: boolean } & EmblaOptionsType>;
  mountOnInit?: boolean;
};
