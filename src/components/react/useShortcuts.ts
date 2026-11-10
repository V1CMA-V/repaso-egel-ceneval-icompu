import { useEffect, useRef } from 'react';

/** True when the key press belongs to a text field / dropdown, so shortcuts must not hijack it. */
export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  if (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true;
  if (t.tagName === 'INPUT') return !['radio', 'checkbox', 'button', 'submit'].includes((t as HTMLInputElement).type);
  return false;
}

/**
 * Global keyboard shortcuts. `onKey` returns `true` when it handled the key (the default action is then prevented).
 * Keys listed in `swallowKeyup` also have their keyup default prevented, so Space does not "click" the focused button
 * a second time after the shortcut already acted on keydown.
 */
export function useShortcuts(onKey: (e: KeyboardEvent) => boolean | void, enabled = true, swallowKeyup: string[] = []) {
  const handler = useRef(onKey);
  handler.current = onKey;
  const swallow = useRef(swallowKeyup);
  swallow.current = swallowKeyup;

  useEffect(() => {
    if (!enabled) return;
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || isTypingTarget(e.target)) return;
      if (handler.current(e) === true) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (swallow.current.includes(e.key) && !isTypingTarget(e.target)) e.preventDefault();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [enabled]);
}
