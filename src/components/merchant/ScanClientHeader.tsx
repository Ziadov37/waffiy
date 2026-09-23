import { StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { fullName, initials, memberSince } from '@/lib/format';
import { spacing } from '@/theme';

type ScanClientHeaderProps = {
  firstName: string;
  lastName: string;
  joinedAt: string | null;
  highlighted?: boolean;
};

/** Identité strictement limitée aux données renvoyées par la RPC de scan. */
export function ScanClientHeader({
  firstName,
  lastName,
  joinedAt,
  highlighted = false,
}: ScanClientHeaderProps) {
  return (
    <View style={styles.row}>
      <Avatar
        initials={initials(firstName, lastName)}
        size={60}
        highlighted={highlighted}
      />
      <View style={styles.copy}>
        <Text variant="title" numberOfLines={2}>
          {fullName(firstName, lastName)}
        </Text>
        <Text variant="caption" tone="secondary">
          {joinedAt ? memberSince(joinedAt) : 'Pas encore membre de ce commerce'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
});
