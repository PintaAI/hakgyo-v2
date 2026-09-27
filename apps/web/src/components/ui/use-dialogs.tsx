"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
};

type PromptField = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea";
  defaultValue?: string;
  min?: number;
  max?: number;
};

type PromptOptions<Name extends string> = {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  fields: Array<PromptField & { name: Name }>;
};

type Request =
  | {
      kind: "confirm";
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "prompt";
      options: PromptOptions<string>;
      resolve: (value: Record<string, string> | null) => void;
    };

/**
 * Promise-based replacements for `window.confirm` and `window.prompt` that
 * render the app's own dialogs. Render `dialogs` once in the component.
 * Prompt fields are required; empty submissions are blocked by the form.
 */
export function useDialogs() {
  const [request, setRequest] = useState<Request | null>(null);
  const [open, setOpen] = useState(false);
  const settled = useRef(false);

  const begin = useCallback((next: Request) => {
    settled.current = false;
    setRequest(next);
    setOpen(true);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) =>
        begin({ kind: "confirm", options, resolve }),
      ),
    [begin],
  );

  const prompt = useCallback(
    <Name extends string>(options: PromptOptions<Name>) =>
      new Promise<Record<Name, string> | null>((resolve) =>
        begin({ kind: "prompt", options, resolve }),
      ),
    [begin],
  );

  function finish(value: boolean | Record<string, string> | null) {
    if (!request || settled.current) return;
    settled.current = true;
    if (request.kind === "confirm") request.resolve(value === true);
    else request.resolve(typeof value === "object" ? value : null);
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) finish(request?.kind === "confirm" ? false : null);
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request?.kind !== "prompt") return;
    const data = new FormData(event.currentTarget);
    finish(
      Object.fromEntries(
        request.options.fields.map((field) => [
          field.name,
          (data.get(field.name) as string | null)?.trim() ?? "",
        ]),
      ),
    );
  }

  const dialogs =
    request?.kind === "confirm" ? (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{request.options.title}</AlertDialogTitle>
            {request.options.description ? (
              <AlertDialogDescription>
                {request.options.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={request.options.destructive ? "destructive" : "default"}
              onClick={() => finish(true)}
            >
              {request.options.confirmLabel ?? "Lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ) : request?.kind === "prompt" ? (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form onSubmit={submitPrompt} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{request.options.title}</DialogTitle>
              {request.options.description ? (
                <DialogDescription>
                  {request.options.description}
                </DialogDescription>
              ) : null}
            </DialogHeader>
            {request.options.fields.map((field, index) => {
              const id = `dialog-field-${field.name}`;
              return (
                <div key={field.name} className="grid gap-2">
                  <Label htmlFor={id}>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={id}
                      name={field.name}
                      required
                      autoFocus={index === 0}
                      defaultValue={field.defaultValue}
                    />
                  ) : (
                    <Input
                      id={id}
                      name={field.name}
                      type={field.type ?? "text"}
                      required
                      autoFocus={index === 0}
                      min={field.min}
                      max={field.max}
                      step={field.type === "number" ? 1 : undefined}
                      defaultValue={field.defaultValue}
                    />
                  )}
                </div>
              );
            })}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => finish(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant={
                  request.options.destructive ? "destructive" : "default"
                }
              >
                {request.options.confirmLabel ?? "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    ) : null;

  return { confirm, prompt, dialogs };
}
