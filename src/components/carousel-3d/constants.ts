// Virtual cycles: the canvas is sized to this many repetitions of all cards.
// User would need to scroll ~650 cards in one direction to reach the edge.
export const VIRTUAL_CYCLES = 100;

export const NAV_CLASS = [
  "shrink-0",
  "flex",
  "items-center",
  "justify-center",
  "w-12",
  "h-12",
  "max-sm:w-9",
  "max-sm:h-9",
  "rounded-full",
  "border-[1.5px]",
  "border-black/15",
  "bg-white/90",
  "text-[#333]",
  "cursor-pointer",
  "z-40",
  "transition-[background-color,box-shadow]",
  "duration-200",
  "backdrop-blur-[4px]",
  "hover:bg-white",
  "hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
  "active:scale-95",
].join(" ");
