/**
 * Small helpers for preview `play` scripts, which put a real component into
 * the state a guide step describes (for example "the create panel is open").
 * They look elements up by their visible label, so a renamed button makes the
 * preview fail loudly instead of silently showing an outdated screen.
 */

const timeoutMs = 5000;

export async function waitFor<T>(
  find: () => T | null | undefined,
  description: string,
): Promise<T> {
  const started = Date.now();
  for (;;) {
    const found = find();
    if (found) return found;
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Pratinjau tidak menemukan ${description}`);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

function accessibleText(element: Element) {
  return (element.getAttribute("aria-label") ?? element.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findByText<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
  text: string,
) {
  return (
    Array.from(root.querySelectorAll<T & Element>(selector)).find(
      (element) => accessibleText(element) === text,
    ) ?? null
  );
}

export async function clickButton(root: ParentNode, text: string) {
  const button = await waitFor(
    () => findByText<HTMLButtonElement>(root, "button, [role=button]", text),
    `tombol "${text}"`,
  );
  button.click();
  return button;
}

export async function waitForText(root: ParentNode, text: string) {
  return waitFor(
    () =>
      Array.from(root.querySelectorAll<HTMLElement>("body *")).find(
        (element) =>
          element.childElementCount === 0 &&
          element.textContent?.trim() === text,
      ),
    `teks "${text}"`,
  );
}
