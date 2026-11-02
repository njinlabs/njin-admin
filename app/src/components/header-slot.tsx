import { createContext, type ReactNode, use, useEffect } from "react";
import { createPortal } from "react-dom";

// The right side of the shell's header. `Shell` keeps the element in state and provides it; a
// page puts its own controls there with `HeaderActions`, so search and "new" sit in the header
// instead of inside the page.
export const HeaderSlot = createContext<HTMLElement | null>(null);

export const HeaderActions = ({ children }: { children: ReactNode }) => {
  const slot = use(HeaderSlot);

  return slot ? createPortal(children, slot) : null;
};

// The title in the header is the menu entry that owns the path. A page that is deeper than its
// entry (a form under "Users") names itself with `PageTitle`; it goes back to the entry's label
// when the page leaves.
export const PageTitleContext = createContext<(title: string | null) => void>(
  () => {},
);

export const PageTitle = ({ children }: { children: string }) => {
  const setTitle = use(PageTitleContext);

  useEffect(() => {
    setTitle(children);

    return () => setTitle(null);
  }, [children, setTitle]);

  return null;
};
