import type { HTMLAttributes, HTMLTag } from "astro/types";

export type CustomHTMLAttributes<T extends HTMLTag> = Omit<
  HTMLAttributes<T>,
  "class"
>;
