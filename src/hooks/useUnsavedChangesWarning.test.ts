import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';

const leave = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('useUnsavedChangesWarning', () => {
  it('asks before leaving only while something is unsaved', () => {
    let unsaved = false;
    renderHook(() => useUnsavedChangesWarning(() => unsaved));
    expect(leave()).toBe(false);
    unsaved = true;
    expect(leave()).toBe(true);
  });

  it('stops listening on unmount', () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(() => true));
    unmount();
    expect(leave()).toBe(false);
  });
});
