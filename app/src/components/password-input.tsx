import { Button, Input } from "@njinlabs/njin-admin/ui";
import { type ComponentProps, useState } from "react";
import { PiEye, PiEyeSlash } from "react-icons/pi";

export const PasswordInput = (props: ComponentProps<typeof Input>) => {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className="pr-10" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShown((value) => !value)}
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 text-muted-foreground"
      >
        {shown ? <PiEyeSlash /> : <PiEye />}
      </Button>
    </div>
  );
};
