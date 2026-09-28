/**
 * Injected only into the owner's draft preview. The sandboxed frame has an
 * opaque origin, so the editor cannot touch its DOM; instead this script makes
 * marked copy editable in place and syncs it with the editor via postMessage.
 * The editor treats every message as untrusted input (known keys, plain text).
 */
const script = `(() => {
  const post = (message) => parent.postMessage({ source: "hakgyo-landing", ...message }, "*");
  const fields = new Map();
  for (const element of document.body.querySelectorAll("[data-hakgyo-edit]")) {
    if (element.closest("template")) continue;
    const key = element.getAttribute("data-hakgyo-edit");
    fields.set(key, element);
    element.contentEditable = "plaintext-only";
    element.spellcheck = false;
    element.addEventListener("input", () => post({ type: "input", key, text: element.textContent }));
    element.addEventListener("focus", () => post({ type: "focus", key }));
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        element.blur();
      }
    });
  }
  // Editing text inside a link or button must not trigger it.
  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-hakgyo-edit]")) event.preventDefault();
  }, true);
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (event.source !== parent || !data || data.source !== "hakgyo-editor") return;
    if (data.type === "set") {
      for (const [key, text] of Object.entries(data.copy)) {
        const element = fields.get(key);
        // Echoes of earlier keystrokes must not overwrite the field being typed in.
        const typing = element === document.activeElement && document.hasFocus();
        if (element && !typing && element.textContent !== text) element.textContent = text;
      }
    }
    if (data.type === "reveal") {
      const element = fields.get(data.key);
      if (!element) return;
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      element.animate([{ outline: "3px solid #6366f1", outlineOffset: "3px" }, { outline: "3px solid transparent", outlineOffset: "3px" }], { duration: 1200 });
    }
  });
  post({ type: "ready" });
})();`;

const style = `[data-hakgyo-edit]{cursor:text;border-radius:2px}
[data-hakgyo-edit]:hover{outline:2px dashed #6366f1;outline-offset:3px}
[data-hakgyo-edit]:focus{outline:2px solid #6366f1;outline-offset:3px}`;

export const landingEditorBridge = `<style>${style}</style><script>${script}</script>`;
