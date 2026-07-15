import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { DropCell } from './DropCell';
import type { DropItem } from './types';

const renderWithProvider = (ui: ReactElement) => render(<MantineProvider>{ui}</MantineProvider>);

describe('DropCell', () => {
  it('renders a dash when there are no drops', () => {
    renderWithProvider(<DropCell drops={[]} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders each drop with its formatted chance', () => {
    const drops: DropItem[] = [{ item: 'Animal Bone', min_drop: 1, max_drop: 3, chance: 12.3456 }];
    renderWithProvider(<DropCell drops={drops} />);
    expect(screen.getByText(/Animal Bone/)).toBeInTheDocument();
    expect(screen.getByText('12.3456%')).toBeInTheDocument();
  });

  it('renders a single group pool header for items sharing a group_id', () => {
    const drops: DropItem[] = [
      { item: 'Item A', min_drop: 1, max_drop: 1, chance: 5, group_id: 0, group_chance: 50, internal_chance: 10 },
      { item: 'Item B', min_drop: 1, max_drop: 1, chance: 5, group_id: 0, group_chance: 50, internal_chance: 10 },
    ];
    renderWithProvider(<DropCell drops={drops} />);
    expect(screen.getAllByText(/Group Pool/)).toHaveLength(1);
  });
});
