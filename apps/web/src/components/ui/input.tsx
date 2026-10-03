import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "~/lib/utils";

/**
 * The fill of every text field: the page colour with a faint shadow. Cards
 * in organization themes are darker than the page, so fields stay lighter
 * than whatever surface they sit on.
 */
const inputSurface =
  "bg-background shadow-xs disabled:bg-muted dark:bg-input/30 dark:disabled:bg-input/80";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        inputSurface,
        "border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 w-full min-w-0 rounded-lg border px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input, inputSurface };
