import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Keyboard, TextInput, type ScrollView } from "react-native";

/** Space between a revealed field and the top of the keyboard. */
const GAP = 16;

/**
 * Keeps the focused field above the keyboard on Android, where
 * `automaticallyAdjustKeyboardInsets` does nothing and the app draws edge to
 * edge, so the keyboard covers the page. (Shrinking the viewport with
 * `KeyboardAvoidingView` instead left Home's answer field under the keyboard.)
 *
 * Only the screen that holds the focused field reacts, so screens still
 * mounted below it in a stack keep their place. While the keyboard is open,
 * the content gets as much room below it as the keyboard covers this scroll
 * view, and the field is scrolled into view, again when another field of the
 * screen is tapped. With `enabled: false` (iOS) it does nothing.
 */
export function useAndroidKeyboardReveal(
  enabled: boolean,
  scrollRef: RefObject<ScrollView | null>,
) {
  /** How far the keyboard covers this scroll view, while it holds the field. */
  const [covered, setCovered] = useState(0);
  const [revealRequest, setRevealRequest] = useState(0);
  const keyboardTop = useRef<number | null>(null);

  /** Calls back with the focused field when it is inside this scroll view. */
  const withOwnFocusedInput = useCallback(
    (
      found: (
        input: NonNullable<
          ReturnType<typeof TextInput.State.currentlyFocusedInput>
        >,
        contentY: number,
        height: number,
      ) => void,
    ) => {
      const input = TextInput.State.currentlyFocusedInput();
      // The content container. React Native has it, but the class typings
      // this app compiles against leave it out.
      const content = (
        scrollRef.current as
          | (ScrollView & {
              getInnerViewRef(): ReturnType<ScrollView["getNativeScrollRef"]>;
            })
          | null
      )?.getInnerViewRef();
      if (!input || !content) return;
      // Fails when the field is not inside this scroll view.
      input.measureLayout(
        content,
        (_x, contentY, _width, height) => found(input, contentY, height),
        () => undefined,
      );
    },
    [scrollRef],
  );

  useEffect(() => {
    if (!enabled) return;
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      const top = event.endCoordinates.screenY;
      keyboardTop.current = top;
      withOwnFocusedInput(() => {
        scrollRef.current
          ?.getNativeScrollRef()
          ?.measureInWindow((_x, y, _width, height) => {
            setCovered(Math.max(0, y + height - top));
            setRevealRequest((request) => request + 1);
          });
      });
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTop.current = null;
      setCovered(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [enabled, scrollRef, withOwnFocusedInput]);

  // Once the room under the content is laid out, scroll the field above the
  // keyboard. Positions come from the views themselves, not a scroll event.
  useLayoutEffect(() => {
    if (!enabled || revealRequest === 0) return;
    const frame = requestAnimationFrame(() => {
      const top = keyboardTop.current;
      const scroll = scrollRef.current;
      if (top === null || !scroll) return;
      withOwnFocusedInput((input, contentY, height) => {
        scroll.getNativeScrollRef()?.measureInWindow((_sx, viewportY) => {
          input.measureInWindow((_ix, windowY) => {
            const hidden = windowY + height + GAP - top;
            if (hidden <= 0) return;
            const scrollY = contentY - (windowY - viewportY);
            scroll.scrollTo({ y: scrollY + hidden, animated: true });
          });
        });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled, revealRequest, scrollRef, withOwnFocusedInput]);

  /** A tap in the content while the keyboard is open may focus another field. */
  const onContentTouchEnd = useCallback(() => {
    if (keyboardTop.current === null) return;
    // Focus moves when the touch ends, after this handler.
    requestAnimationFrame(() => setRevealRequest((request) => request + 1));
  }, []);

  return {
    covered: enabled ? covered : 0,
    onContentTouchEnd: enabled ? onContentTouchEnd : undefined,
  };
}
