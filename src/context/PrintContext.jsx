import { createContext, useContext } from 'react';

// True only inside the off-screen print tree. Blocks that render something paper
// cannot carry — an orbiting animation, a YouTube iframe — read this and render a
// static, ink-friendly equivalent instead of their screen version.
const PrintContext = createContext(false);

export const PrintProvider = PrintContext.Provider;

export function usePrintMode() {
  return useContext(PrintContext);
}

// Any control anywhere in the book can ask for the print dialog by firing this on
// window — the cover's button lives inside a flip-book page, far from PrintButton.
// It lives here, in a leaf module, so the cover does not have to import the print
// component tree (which renders the cover): that would be an import cycle.
export const PRINT_REQUEST_EVENT = 'book:print';
