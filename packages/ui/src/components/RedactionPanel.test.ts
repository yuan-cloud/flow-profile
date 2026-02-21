import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { RedactionEntry } from './RedactionPanel.vue';
import RedactionPanel from './RedactionPanel.vue';

const baseProps = {
  enabled: true,
  strictMode: false,
  threshold: 4.5,
};

describe('RedactionPanel', () => {
  it('renders title and subtitle', () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    expect(wrapper.find('.redaction-panel__title').text()).toBe('Redaction Settings');
    expect(wrapper.find('.redaction-panel__subtitle').text()).toContain('Control how secrets');
  });

  it('shows Enabled badge when enabled', () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    expect(wrapper.find('.redaction-panel__badge').text()).toBe('Enabled');
    expect(wrapper.find('.redaction-panel__badge').attributes('data-status')).toBe('on');
  });

  it('shows Disabled badge when disabled', () => {
    const wrapper = mount(RedactionPanel, {
      props: { ...baseProps, enabled: false },
    });
    expect(wrapper.find('.redaction-panel__badge').text()).toBe('Disabled');
    expect(wrapper.find('.redaction-panel__badge').attributes('data-status')).toBe('off');
  });

  it('shows warning when disabled', () => {
    const wrapper = mount(RedactionPanel, {
      props: { ...baseProps, enabled: false },
    });
    expect(wrapper.find('.redaction-panel__warning').exists()).toBe(true);
    expect(wrapper.text()).toContain('WARNING: Redaction disabled');
  });

  it('hides warning when enabled', () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    expect(wrapper.find('.redaction-panel__warning').exists()).toBe(false);
  });

  it('shows confirmation flow when unchecking enable', async () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    const checkbox = wrapper.find('.redaction-panel__checkbox');
    await checkbox.setValue(false);

    // Should show confirm dialog, not immediately emit
    expect(wrapper.find('.redaction-panel__warning').exists()).toBe(true);
    expect(wrapper.find('.redaction-panel__badge').text()).toBe('Confirm disable');
    expect(wrapper.emitted('update:enabled')).toBeUndefined();
  });

  it('emits update:enabled false on confirm disable', async () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    const checkbox = wrapper.find('.redaction-panel__checkbox');
    await checkbox.setValue(false);

    const confirmBtn = wrapper
      .findAll('.redaction-panel__warning-button')
      .find((btn) => btn.text().includes('I understand'));
    if (!confirmBtn) throw new Error('Expected confirm disable button');
    await confirmBtn.trigger('click');
    expect(wrapper.emitted('update:enabled')).toEqual([[false]]);
  });

  it('cancels disable on Keep redaction click', async () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    const checkbox = wrapper.find('.redaction-panel__checkbox');
    await checkbox.setValue(false);

    const cancelBtn = wrapper
      .findAll('.redaction-panel__warning-button')
      .find((btn) => btn.text().includes('Keep redaction'));
    if (!cancelBtn) throw new Error('Expected keep redaction button');
    await cancelBtn.trigger('click');

    expect(wrapper.emitted('update:enabled')).toBeUndefined();
    expect(wrapper.find('.redaction-panel__warning').exists()).toBe(false);
  });

  it('emits update:enabled true on re-enable click', async () => {
    const wrapper = mount(RedactionPanel, {
      props: { ...baseProps, enabled: false },
    });
    const reEnableBtn = wrapper
      .findAll('.redaction-panel__warning-button')
      .find((btn) => btn.text().includes('Re-enable'));
    if (!reEnableBtn) throw new Error('Expected re-enable button');
    await reEnableBtn.trigger('click');
    expect(wrapper.emitted('update:enabled')).toEqual([[true]]);
  });

  it('emits update:strictMode on strict checkbox toggle', async () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    const checkboxes = wrapper.findAll('.redaction-panel__checkbox');
    await checkboxes[1].setValue(true);
    expect(wrapper.emitted('update:strictMode')).toEqual([[true]]);
  });

  it('disables strict checkbox when redaction is disabled', () => {
    const wrapper = mount(RedactionPanel, {
      props: { ...baseProps, enabled: false },
    });
    const checkboxes = wrapper.findAll('.redaction-panel__checkbox');
    expect((checkboxes[1].element as HTMLInputElement).disabled).toBe(true);
  });

  it('displays threshold value in input', () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    const input = wrapper.find('.redaction-panel__threshold-input');
    expect((input.element as HTMLInputElement).value).toBe('4.5');
  });

  it('emits update:threshold on threshold input blur', async () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    const input = wrapper.find('.redaction-panel__threshold-input');
    await input.setValue('5.2');
    await input.trigger('blur');
    const emitted = wrapper.emitted('update:threshold');
    if (!emitted) throw new Error('Expected update:threshold emission');
    expect(emitted[emitted.length - 1][0]).toBeCloseTo(5.2, 1);
  });

  it('clamps threshold to min/max range', async () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    const input = wrapper.find('.redaction-panel__threshold-input');
    await input.setValue('10');
    await input.trigger('blur');
    const emitted = wrapper.emitted('update:threshold');
    if (!emitted) throw new Error('Expected update:threshold emission');
    expect(emitted[emitted.length - 1][0]).toBe(6);
  });

  it('renders redaction report items', () => {
    const redactions: RedactionEntry[] = [
      { fieldPath: 'nodes[0].config.password', maskAssigned: '***REDACTED***', reason: 'pattern' },
      {
        fieldPath: 'nodes[1].env.API_KEY',
        maskAssigned: '***REDACTED***',
        reason: 'entropy',
        entropyValue: 4.8,
      },
    ];
    const wrapper = mount(RedactionPanel, {
      props: { ...baseProps, redactions },
    });
    expect(wrapper.find('.redaction-panel__report-count').text()).toBe('2 items');
    expect(wrapper.findAll('.redaction-panel__report-item')).toHaveLength(2);
  });

  it('shows max 5 report items with overflow count', () => {
    const redactions: RedactionEntry[] = Array.from({ length: 8 }, (_, i) => ({
      fieldPath: `path.${i}`,
      maskAssigned: '***',
      reason: 'pattern',
    }));
    const wrapper = mount(RedactionPanel, {
      props: { ...baseProps, redactions },
    });
    expect(wrapper.findAll('.redaction-panel__report-item')).toHaveLength(5);
    expect(wrapper.find('.redaction-panel__report-more').text()).toContain('3 more');
  });

  it('shows empty report message when no redactions', () => {
    const wrapper = mount(RedactionPanel, { props: baseProps });
    expect(wrapper.find('.redaction-panel__report-empty').text()).toBe(
      'No redactions captured yet.',
    );
  });

  it('formats entropy reason with value', () => {
    const redactions: RedactionEntry[] = [
      { fieldPath: 'x', maskAssigned: '***', reason: 'entropy', entropyValue: 5.23 },
    ];
    const wrapper = mount(RedactionPanel, {
      props: { ...baseProps, redactions },
    });
    expect(wrapper.find('.redaction-panel__report-reason').text()).toBe('entropy: 5.2');
  });
});
