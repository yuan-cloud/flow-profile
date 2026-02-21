import { ref } from 'vue';

export type ShortcutId =
  | 'commandPalette'
  | 'copyContext'
  | 'downloadContext'
  | 'downloadBundle'
  | 'resetFlow'
  | 'panelFlow'
  | 'panelPreview'
  | 'panelControls';

export type ShortcutMap = Record<ShortcutId, string>;

const STORAGE_KEY = 'fp.shortcuts';

const defaultShortcuts: ShortcutMap = {
  commandPalette: 'mod+k',
  copyContext: 'mod+shift+c',
  downloadContext: 'mod+shift+d',
  downloadBundle: 'mod+shift+b',
  resetFlow: 'mod+shift+x',
  panelFlow: 'alt+1',
  panelPreview: 'alt+2',
  panelControls: 'alt+3',
};

const readOverrides = (): Partial<ShortcutMap> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ShortcutMap>;
    return parsed ?? {};
  } catch {
    return {};
  }
};

const isMacPlatform = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /mac/i.test(navigator.platform);
};

export const useShortcuts = () => {
  const shortcuts = ref<ShortcutMap>({ ...defaultShortcuts, ...readOverrides() });

  const formatShortcut = (value: string) => {
    const tokens = value.split('+');
    const isMac = isMacPlatform();
    const tokenMap: Record<string, string> = isMac
      ? { mod: '⌘', shift: '⇧', alt: '⌥', meta: '⌘', ctrl: 'Ctrl' }
      : { mod: 'Ctrl', shift: 'Shift', alt: 'Alt', meta: 'Meta', ctrl: 'Ctrl' };
    return tokens.map((token) => tokenMap[token] ?? token.toUpperCase()).join(isMac ? '' : '+');
  };

  return { shortcuts, formatShortcut };
};

export const shortcutsDefaults = defaultShortcuts;
