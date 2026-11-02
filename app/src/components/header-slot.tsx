import { createContext, type ReactNode, use } from "react";
import { createPortal } from "react-dom";

// The right side of the shell's header. `Shell` keeps the element in state and provides it; a
// page puts its own controls there with `HeaderActions`, so search and "new" sit in the header
// instead of inside the page.
export const HeaderSlot = createContext<HTMLElement | null>(null);

export const HeaderActions = ({ children }: { children: ReactNode }) => {
  const slot = use(HeaderSlot);

  return slot ? createPortal(children, slot) : null;
};
