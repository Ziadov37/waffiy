import { Tabs, useRouter } from 'expo-router';

import { TabBar, type TabItem } from '@/components/ui';

const ITEMS: readonly TabItem[] = [
  { name: 'index', label: 'Accueil', icon: 'home' },
  { name: 'cards', label: 'Mes cartes', icon: 'cards' },
  { name: 'notifications', label: 'Notifs', icon: 'bell' },
  { name: 'profile', label: 'Profil', icon: 'user' },
];

export default function ClientTabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TabBar
          {...props}
          items={ITEMS}
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
