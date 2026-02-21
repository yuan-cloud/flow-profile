/**
 * Icon System Exports
 *
 * This module provides the FpIcon component and commonly used icon names.
 *
 * Usage:
 *   import { FpIcon, ICONS } from '@/components/icons';
 *
 *   <FpIcon :name="ICONS.WARNING" size="md" />
 */

export { default as FpIcon } from './FpIcon.vue';

/**
 * Semantic icon name mapping
 *
 * Use these constants for consistent icon usage across the app.
 * Maps semantic meaning to Lucide icon names.
 */
export const ICONS = {
  // Status & Feedback
  SUCCESS: 'CheckCircle',
  WARNING: 'AlertTriangle',
  ERROR: 'XCircle',
  INFO: 'Info',

  // Severity levels (for risk findings)
  SEVERITY_HIGH: 'AlertOctagon',
  SEVERITY_MEDIUM: 'AlertTriangle',
  SEVERITY_LOW: 'Info',

  // Actions
  COPY: 'Copy',
  DOWNLOAD: 'Download',
  UPLOAD: 'Upload',
  REFRESH: 'RefreshCw',
  CLOSE: 'X',
  MENU: 'Menu',
  SETTINGS: 'Settings',
  SEARCH: 'Search',
  FILTER: 'Filter',
  EXPAND: 'ChevronDown',
  COLLAPSE: 'ChevronUp',
  NEXT: 'ChevronRight',
  PREV: 'ChevronLeft',
  EXTERNAL_LINK: 'ExternalLink',

  // Objects
  FILE: 'File',
  FILE_JSON: 'FileJson',
  FOLDER: 'Folder',
  CODE: 'Code',
  TERMINAL: 'Terminal',

  // Flow/Graph
  NODE: 'Circle',
  EDGE: 'ArrowRight',
  FLOW: 'GitBranch',
  SUBFLOW: 'Box',
  TAB: 'Layers',

  // Misc
  LOADING: 'Loader2',
  HELP: 'HelpCircle',
  USER: 'User',
  LOCK: 'Lock',
  UNLOCK: 'Unlock',
  EYE: 'Eye',
  EYE_OFF: 'EyeOff',
  CHECK: 'Check',
  PLUS: 'Plus',
  MINUS: 'Minus',
  TRASH: 'Trash2',
  EDIT: 'Pencil',
} as const;

/**
 * Icon size reference
 *
 * sm:  16px - Inline with small text, badges
 * md:  20px - Default size, buttons, list items
 * lg:  24px - Prominent icons, section headers
 * xl:  32px - Hero icons, empty states
 */
export type IconSize = 'sm' | 'md' | 'lg' | 'xl';
