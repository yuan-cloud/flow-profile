const LIVE_REGION_ID = 'app-live-region';

const getLiveRegion = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return document.getElementById(LIVE_REGION_ID);
};

export const useAnnounce = () => {
  const announce = (message: string) => {
    if (!message) return;
    const region = getLiveRegion();
    if (!region) return;
    region.textContent = '';
    window.setTimeout(() => {
      region.textContent = message;
    }, 0);
  };

  return { announce };
};
