import { router } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { QuestionStatus } from "../lib/question-progress";

export type QuestionNavigatorSession = {
  title: string;
  current: number;
  statuses: QuestionStatus[];
  onSelect: (index: number) => Promise<boolean> | boolean;
};
type Session = QuestionNavigatorSession & { owner: string };
const Context = createContext<{
  session: Session | null;
  open: (session: Session) => void;
  clear: (owner: string) => void;
} | null>(null);

export function QuestionNavigatorProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const open = useCallback((next: Session) => {
    setSession(next);
    router.navigate("/assessment-questions");
  }, []);
  const clear = useCallback(
    (owner: string) =>
      setSession((current) => (current?.owner === owner ? null : current)),
    [],
  );
  return (
    <Context.Provider value={{ session, open, clear }}>
      {children}
    </Context.Provider>
  );
}

export function useQuestionNavigatorSession() {
  const context = useContext(Context);
  if (!context) throw new Error("QuestionNavigatorProvider is missing");
  return context;
}

/** Callbacks remain current while the native sheet covers its source screen. */
export function useQuestionNavigator(session: QuestionNavigatorSession) {
  const { open, clear } = useQuestionNavigatorSession();
  const owner = useId();
  const latest = useRef(session);
  latest.current = session;
  useEffect(() => () => clear(owner), [clear, owner]);
  return () =>
    open({
      ...latest.current,
      owner,
      onSelect: (index) =>
        index >= 0 && index < latest.current.statuses.length
          ? latest.current.onSelect(index)
          : false,
    });
}
