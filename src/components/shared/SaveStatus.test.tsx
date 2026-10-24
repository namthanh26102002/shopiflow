import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SaveStatus } from './SaveStatus';

describe('SaveStatus', () => {
  it('says Saved when nothing is pending', () => {
    render(<SaveStatus saving={false} failed={false} onRetry={() => {}} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows saving over a previous failure', () => {
    render(<SaveStatus saving failed onRetry={() => {}} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText("Couldn't save")).not.toBeInTheDocument();
  });

  it('never claims Saved after a failed save, and offers a retry', () => {
    const onRetry = vi.fn();
    render(<SaveStatus saving={false} failed onRetry={onRetry} />);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save");
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
