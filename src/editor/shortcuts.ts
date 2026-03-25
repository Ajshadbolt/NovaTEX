import { ShortcutDefinition } from '../types';

const CODE_LABELS: Record<string, string> = {
  Digit0: '0',
  Enter: 'Enter',
  Equal: '=',
  Minus: '-',
  Slash: '/',
  Space: 'Space',
};

function getCodeLabel(code: string) {
  if (CODE_LABELS[code]) {
    return CODE_LABELS[code];
  }

  if (code.startsWith('Key')) {
    return code.slice(3);
  }

  if (code.startsWith('Digit')) {
    return code.slice(5);
  }

  return code;
}

export function formatShortcut(shortcut: ShortcutDefinition, isMac: boolean) {
  const parts: string[] = [];

  if (shortcut.primary) {
    parts.push(isMac ? 'Cmd' : 'Ctrl');
  }

  if (shortcut.shift) {
    parts.push('Shift');
  }

  if (shortcut.alt) {
    parts.push(isMac ? 'Option' : 'Alt');
  }

  parts.push(getCodeLabel(shortcut.code));
  return parts.join('+');
}

export function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDefinition, isMac: boolean) {
  const primaryPressed = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  const needsPrimary = Boolean(shortcut.primary);

  if (event.code !== shortcut.code) {
    return false;
  }

  if (needsPrimary !== primaryPressed) {
    return false;
  }

  if (Boolean(shortcut.shift) !== event.shiftKey) {
    return false;
  }

  if (Boolean(shortcut.alt) !== event.altKey) {
    return false;
  }

  return true;
}

export function isTextInputLike(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest('.cm-editor')) {
    return false;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}
