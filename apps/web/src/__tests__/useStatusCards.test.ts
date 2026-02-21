import { describe, expect, it } from 'vitest';

import { useStatusCards } from '@/composables/useStatusCards';

describe('useStatusCards', () => {
  it('returns an array of status cards', () => {
    const cards = useStatusCards();
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('each card has title, detail, and description', () => {
    const cards = useStatusCards();
    for (const card of cards) {
      expect(card).toHaveProperty('title');
      expect(card).toHaveProperty('detail');
      expect(card).toHaveProperty('description');
      expect(typeof card.title).toBe('string');
      expect(typeof card.detail).toBe('string');
      expect(typeof card.description).toBe('string');
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.detail.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
    }
  });
});
