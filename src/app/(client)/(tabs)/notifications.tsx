import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { Card, Screen, Text } from '@/components/ui';
import { NOTIFICATION_STYLE, type NotificationRow } from '@/features/notifications/api';
import { useMarkAllRead, useNotifications } from '@/features/notifications/hooks';
import { relativeDate, timeOfDay } from '@/lib/format';
import { colors, spacing } from '@/theme';

const TONE_SURFACE = {
  neutral: { surface: colors.surface, border: colors.border },
  success: { surface: colors.primarySurface, border: colors.primaryBorder },
  reward: { surface: colors.rewardSurface, border: colors.rewardBorder },
} as const;

export default function ClientNotifications() {
  const router = useRouter();
  const { data, isPending, refetch, isRefetching } = useNotifications();
  const markAllRead = useMarkAllRead();

  // Ouvrir l'écran vaut lecture. Marquer au démontage plutôt qu'au montage
  // serait plus juste, mais l'utilisateur verrait la pastille persister
  // pendant toute sa consultation.
  const { mutate: markRead } = markAllRead;
  useEffect(() => {
    if (data?.some((n) => n.read_at === null)) markRead();
  }, [data, markRead]);

  const open = (notification: NotificationRow) => {
    const screen = (notification.data as { screen?: string } | null)?.screen;
    if (screen === 'rewards') router.push('/(client)/rewards');
    else if (notification.merchant_id)
      router.push(`/(client)/card/${notification.merchant_id}`);
  };

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View style={styles.content}>
        <Text variant="title">Notifications</Text>

        {isPending ? (
          <Card>
            <Text tone="secondary">Chargement…</Text>
          </Card>
        ) : data && data.length > 0 ? (
          <View style={styles.list}>
            {data.map((n) => {
              const style = NOTIFICATION_STYLE[n.kind];
              const tone = TONE_SURFACE[style.tone];
              return (
                <Card
                  key={n.id}
                  surface={tone.surface}
                  border={tone.border}
                  onPress={() => open(n)}
                  accessibilityLabel={`${n.title}. ${n.body}`}
                >
                  <View style={styles.row}>
                    <Text style={styles.emoji}>{style.emoji}</Text>
                    <View style={styles.body}>
                      <Text variant="subheading">{n.title}</Text>
                      <Text variant="caption" tone="secondary">
                        {n.body}
                      </Text>
                      <Text variant="caption" tone="tertiary" style={styles.time}>
                        {relativeDate(n.created_at)} • {timeOfDay(n.created_at)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <EmptyState
            emoji="🔔"
            title="Aucune notification"
            description="Vos visites et récompenses apparaîtront ici."
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 20 },
  list: {
    gap: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 14,
  },
  row: { flexDirection: 'row', gap: 13 },
  emoji: { fontSize: 20, lineHeight: 24 },
  body: { flex: 1, gap: 5 },
  time: { marginTop: 0, color: '#A2AAB6', fontWeight: '700' },
});
