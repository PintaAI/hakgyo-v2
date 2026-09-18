export type AutosaveFlush = () => Promise<void>;
export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export type AutosaveRegistry = {
  register: (key: string, flush: AutosaveFlush) => () => void;
  flushAll: () => Promise<void>;
  getStatus: () => AutosaveStatus;
  setStatus: (key: string, status: AutosaveStatus) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createAutosaveRegistry(): AutosaveRegistry {
  const flushers = new Map<string, AutosaveFlush>();
  const statuses = new Map<string, AutosaveStatus>();
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  const getStatus = (): AutosaveStatus => {
    const current = [...statuses.values()];
    if (current.includes("error")) return "error";
    if (current.includes("saving")) return "saving";
    if (current.includes("pending")) return "pending";
    if (current.includes("saved")) return "saved";
    return "idle";
  };

  return {
    register(key, flush) {
      flushers.set(key, flush);
      statuses.set(key, "idle");
      notify();
      return () => {
        if (flushers.get(key) !== flush) return;
        flushers.delete(key);
        statuses.delete(key);
        notify();
      };
    },
    async flushAll() {
      await Promise.all([...flushers.values()].map((flush) => flush()));
    },
    getStatus,
    setStatus(key, status) {
      if (statuses.get(key) === status) return;
      statuses.set(key, status);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
