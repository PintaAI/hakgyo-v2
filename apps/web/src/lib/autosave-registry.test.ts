import { describe, expect, test } from "bun:test";

import { createAutosaveRegistry } from "./autosave-registry";

describe("autosave registry", () => {
  test("leaving an editor waits for every registered field save", async () => {
    const registry = createAutosaveRegistry();
    const saved: string[] = [];

    registry.register("question-1", async () => {
      await Promise.resolve();
      saved.push("question-1");
    });
    registry.register("option-1", async () => {
      await Promise.resolve();
      saved.push("option-1");
    });

    await registry.flushAll();

    expect(saved.sort()).toEqual(["option-1", "question-1"]);
  });

  test("unregistered fields are not flushed after they leave the editor", async () => {
    const registry = createAutosaveRegistry();
    let saveCount = 0;
    const unregister = registry.register("question-1", async () => {
      saveCount += 1;
    });

    unregister();
    await registry.flushAll();

    expect(saveCount).toBe(0);
  });

  test("a failed field save prevents the editor from reporting a clean leave", async () => {
    const registry = createAutosaveRegistry();
    registry.register("question-1", async () => {
      throw new Error("network unavailable");
    });

    expect(registry.flushAll()).rejects.toThrow("network unavailable");
  });

  test("reports the most urgent save state across registered fields", () => {
    const registry = createAutosaveRegistry();
    registry.register("question-1", async () => undefined);
    registry.register("option-1", async () => undefined);

    registry.setStatus("question-1", "saved");
    registry.setStatus("option-1", "pending");
    expect(registry.getStatus()).toBe("pending");

    registry.setStatus("question-1", "error");
    expect(registry.getStatus()).toBe("error");

    registry.setStatus("question-1", "saved");
    registry.setStatus("option-1", "saved");
    expect(registry.getStatus()).toBe("saved");
  });
});
