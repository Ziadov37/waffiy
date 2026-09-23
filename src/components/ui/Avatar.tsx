import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { Text } from './Text';

export type AvatarProps = {
  initials: string;
  size?: number;
  /** Teinte or quand le client a une récompense en attente. */
  highlighted?: boolean;
};

export function Avatar({ initials, size = 44, highlighted = false }: AvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size >= 56 ? 18 : 14,
          backgroundColor: highlighted ? colors.rewardSurface : colors.avatarSurface,
        },
      ]}
    >
      <Text
        variant={size >= 56 ? 'heading' : 'label'}
        style={{ color: highlighted ? colors.rewardText : colors.primaryDark }}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
