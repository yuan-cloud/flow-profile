import type { AppStatusCard } from '@/types/app';

export const useStatusCards = (): AppStatusCard[] => [
  {
    title: 'Status',
    detail: 'OK — Runtime online',
    description: 'Vite dev server boots, Tailwind utilities apply, and TypeScript is clean.',
  },
  {
    title: 'Next',
    detail: 'Wire in worker pipeline',
    description: 'Heavy parsing stays off the main thread, with progress updates for the UI.',
  },
];
