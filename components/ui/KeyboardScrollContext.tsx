import React, { createContext, useCallback, useContext, useEffect, useRef, type RefObject } from 'react';
import { Keyboard, type ScrollViewInstance, type TextInputInstance } from 'react-native';

type FocusedInput = {
  handle: number;
  input: TextInputInstance;
};

type KeyboardScrollContextValue = (handle: number, input: TextInputInstance) => void;

const KeyboardScrollContext = createContext<KeyboardScrollContextValue | null>(null);

export function KeyboardScrollProvider({
  scrollRef,
  children,
}: {
  scrollRef: RefObject<ScrollViewInstance | null>;
  children: React.ReactNode;
}) {
  const focusedInput = useRef<FocusedInput | null>(null);

  const revealFocusedInput = useCallback((keyboardTop: number) => {
    const target = focusedInput.current;
    const scroll = scrollRef.current;
    if (!target || !scroll) return;

    target.input.measureInWindow((_x, inputY, _width, inputHeight) => {
      if (inputY + inputHeight <= keyboardTop - 80) return;

      scroll.measureInWindow((_scrollX, scrollY) => {
        scroll.scrollResponderScrollNativeHandleToKeyboard(target.handle, scrollY + 80, true);
      });
    });
  }, [scrollRef]);

  const onInputFocus = useCallback((handle: number, input: TextInputInstance) => {
    focusedInput.current = { handle, input };
    const keyboard = Keyboard.metrics();
    if (keyboard) {
      requestAnimationFrame(() => revealFocusedInput(keyboard.screenY));
    }
  }, [revealFocusedInput]);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      revealFocusedInput(event.endCoordinates.screenY);
    });
    return () => subscription.remove();
  }, [revealFocusedInput]);

  return (
    <KeyboardScrollContext.Provider value={onInputFocus}>
      {children}
    </KeyboardScrollContext.Provider>
  );
}

export function useKeyboardScrollFocus() {
  return useContext(KeyboardScrollContext);
}