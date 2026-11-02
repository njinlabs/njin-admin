import { logout, type Row } from "@njinlabs/njin-admin/sdk";
import {
  Button,
  ConfirmDialog,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useCookies } from "react-cookie";
import { PiSignOut } from "react-icons/pi";
import { client } from "../lib/client";

// The signed-in user at the foot of the sidebar; a click opens what can be done with the session
// (only signing out for now, after a confirmation).
export const UserMenu = ({ user }: { user: Row }) => {
  const [, , removeCookie] = useCookies(["token"]);
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const name = String(user.name ?? "");
  const email = String(user.email ?? "");

  const signOut = useMutation({
    mutationFn: () => logout(client),
    // A session the server no longer knows is as good as ended, so a failed request still signs out.
    onSettled: () => {
      // What was loaded belongs to this session. Without the cookie, `Protected` sends the page to
      // the login (through the router, no reload) and drops the header.
      queryClient.removeQueries({ queryKey: ["schema"] });
      queryClient.removeQueries({ queryKey: ["model"] });
      removeCookie("token", { path: "/" });
    },
  });

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger className="flex w-full items-center gap-2 rounded-control border border-transparent p-2 text-left outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/50 data-[popup-open]:bg-subtle">
          <div className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-subtle font-mono text-sm uppercase">
            {(name || email).charAt(0)}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1">
          <Button
            variant="danger-ghost"
            className="w-full justify-start"
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
          >
            <PiSignOut />
            Sign out
          </Button>
        </PopoverContent>
      </Popover>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sign out?"
        description="You will need to sign in again to use the admin."
        confirmLabel={signOut.isPending ? "Signing out…" : "Sign out"}
        onConfirm={() => signOut.mutate()}
        pending={signOut.isPending}
        variant="danger"
      />
    </>
  );
};
