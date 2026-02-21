import { describe, expect, it } from 'vitest';

import { useVirtualScroll } from './useVirtualScroll';

const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
const ITEM_HEIGHT = 40;

describe('useVirtualScroll', () => {
  it('computes totalHeight from items and itemHeight', () => {
    const { totalHeight } = useVirtualScroll(items, ITEM_HEIGHT);
    expect(totalHeight.value).toBe(4000);
  });

  it('starts with startIndex 0', () => {
    const { startIndex } = useVirtualScroll(items, ITEM_HEIGHT);
    expect(startIndex.value).toBe(0);
  });

  it('computes endIndex based on viewport and overscan', () => {
    const { endIndex, onScroll } = useVirtualScroll(items, ITEM_HEIGHT, 2);
    // Simulate viewport of 200px (5 visible items) + 2*2 overscan = 9
    onScroll({ target: { scrollTop: 0, clientHeight: 200 } } as unknown as Event);
    expect(endIndex.value).toBe(9);
  });

  it('returns visible items slice', () => {
    const { visibleItems, onScroll } = useVirtualScroll(items, ITEM_HEIGHT, 2);
    onScroll({ target: { scrollTop: 0, clientHeight: 200 } } as unknown as Event);
    expect(visibleItems.value).toEqual(items.slice(0, 9));
    expect(visibleItems.value[0]).toBe('item-0');
  });

  it('adjusts window on scroll', () => {
    const { startIndex, endIndex, visibleItems, onScroll } = useVirtualScroll(
      items,
      ITEM_HEIGHT,
      2,
    );
    // Scroll to 800px = item 20, startIndex = 20 - 2 = 18
    onScroll({ target: { scrollTop: 800, clientHeight: 200 } } as unknown as Event);
    expect(startIndex.value).toBe(18);
    // endIndex = 18 + ceil(200/40) + 2*2 = 18 + 5 + 4 = 27
    expect(endIndex.value).toBe(27);
    expect(visibleItems.value).toEqual(items.slice(18, 27));
  });

  it('clamps startIndex to 0', () => {
    const { startIndex, onScroll } = useVirtualScroll(items, ITEM_HEIGHT, 10);
    // scrollTop=0, floor(0/40) - 10 = -10, clamped to 0
    onScroll({ target: { scrollTop: 0, clientHeight: 200 } } as unknown as Event);
    expect(startIndex.value).toBe(0);
  });

  it('clamps endIndex to items length', () => {
    const { endIndex, onScroll } = useVirtualScroll(items, ITEM_HEIGHT, 2);
    // Scroll near the end
    onScroll({ target: { scrollTop: 3800, clientHeight: 400 } } as unknown as Event);
    expect(endIndex.value).toBe(100);
  });

  it('computes offsetY from startIndex', () => {
    const { offsetY, onScroll } = useVirtualScroll(items, ITEM_HEIGHT, 2);
    onScroll({ target: { scrollTop: 400, clientHeight: 200 } } as unknown as Event);
    // startIndex = floor(400/40) - 2 = 10 - 2 = 8
    expect(offsetY.value).toBe(8 * ITEM_HEIGHT);
  });

  it('handles empty items array', () => {
    const { totalHeight, startIndex, endIndex, visibleItems } = useVirtualScroll([], ITEM_HEIGHT);
    expect(totalHeight.value).toBe(0);
    expect(startIndex.value).toBe(0);
    expect(endIndex.value).toBe(0);
    expect(visibleItems.value).toEqual([]);
  });

  it('ignores onScroll when target is null', () => {
    const { startIndex, onScroll } = useVirtualScroll(items, ITEM_HEIGHT);
    onScroll({ target: null } as unknown as Event);
    expect(startIndex.value).toBe(0);
  });

  it('uses default overscan of 4', () => {
    const { startIndex, endIndex, onScroll } = useVirtualScroll(items, ITEM_HEIGHT);
    onScroll({ target: { scrollTop: 400, clientHeight: 200 } } as unknown as Event);
    // startIndex = floor(400/40) - 4 = 10 - 4 = 6
    expect(startIndex.value).toBe(6);
    // endIndex = 6 + ceil(200/40) + 4*2 = 6 + 5 + 8 = 19
    expect(endIndex.value).toBe(19);
  });
});
