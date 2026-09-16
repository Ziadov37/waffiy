import { Tabs, useRouter } from 'expo-router';

import { TabBar, type TabItem } from '@/components/ui';
import { useUnreadCount } from '@/features/notifications/hooks';

export default function ClientTabsLayout() {
  const router = useRouter();
  const { data: unread } = useUnreadCount();

  const items: readonly TabItem[] = [
    { name: 'index', label: 'Accueil', icon: 'home' },
    { name: 'cards', label: 'Mes cartes', icon: 'cards' },
    { name: 'notifications', label: 'Notifs', icon: 'bell', ...(unread ? { badge: unread } : {}) },
    { name: 'profile', label: 'Profil', icon: 'user' },
  ];

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TabBar
          {...props}
          items={items}
          center={{
            label: 'QR',
            icon: 'qr',
            tone: 'primary',
            onPress: () => router.push('/(client)/qr'),
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="cards" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
