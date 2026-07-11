import { memo } from 'react';
import { Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import type { DropItem } from './types';

interface DropCellProps {
  drops?: DropItem[];
  query?: string;
}

// React.memo is the magic here. It caches the fully rendered DOM tree.
export const DropCell = memo(({ drops, query }: DropCellProps) => {
  if (!drops || drops.length === 0) return <Text size="sm" c="dimmed">-</Text>;

  const isMatch = (itemName: string) =>
    query && itemName.toLowerCase().includes(query.toLowerCase());

  const formatChance = (chance: number) => parseFloat(chance.toFixed(4));

  return (
    <Stack gap={4} py="xs">
      {drops.map((d, i) => {
        const isGroupItem = d.group_id !== undefined;
        const isNewGroup = isGroupItem && (i === 0 || d.group_id !== drops[i - 1].group_id);

        const hasRange = d.max_drop - d.min_drop >= 1;
        const hasStaticMultiple = d.max_drop === d.min_drop && d.min_drop > 1;

        return (
          <div key={i}>
            {isNewGroup && (
              <Group gap={6} mt={i > 0 ? "xs" : 0} mb={4}>
                <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Group Pool ({formatChance(d.group_chance!)}% rate)
                </Text>
                <div style={{ flex: 1, borderTop: '1px dashed var(--mantine-color-dark-4)' }} />
              </Group>
            )}

            <Group gap="xs" wrap="nowrap" pl={isGroupItem ? "sm" : 0}>
              {/* Note: If tooltips were lagging your scroll earlier, you might still want to remove them! */}
              <Tooltip
                label={isGroupItem
                  ? `Formula: Group (${formatChance(d.group_chance!)}%) × Slot (${formatChance(d.internal_chance!)}%)`
                  : "Flat standalone server roll"
                }
                position="right"
                withArrow
              >
                <Badge
                  size="sm"
                  variant={isMatch(d.item) ? "filled" : "light"}
                  color={isMatch(d.item) ? "yellow" : isGroupItem ? "indigo" : "blue"}
                  w={75}
                  style={{ cursor: 'help' }}
                >
                  {formatChance(d.chance)}%
                </Badge>
              </Tooltip>

              <Text
                size="sm"
                fw={isMatch(d.item) ? 700 : 400}
                c={isMatch(d.item) ? "yellow.7" : "inherit"}
              >
                {d.item}
                {hasRange && ` (${d.min_drop} - ${d.max_drop})`}
                {hasStaticMultiple && ` (${d.min_drop})`}

                {isGroupItem && (
                  <Text component="span" size="xs" c="dimmed" ml="xs" fw={400}>
                    [{formatChance(d.internal_chance!)}%]
                  </Text>
                )}
              </Text>
            </Group>
          </div>
        );
      })}
    </Stack>
  );
});