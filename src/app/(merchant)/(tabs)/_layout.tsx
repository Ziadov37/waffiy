import { Tabs, useRouter } from 'expo-router';

import { TabBar, type TabItem } from '@/components/ui';

const ITEMS: readonly TabItem[] = [
  { name: 'index', label: 'Accueil', icon: 'home' },
  { name: 'customers', label: 'Clients', icon: 'users' },
  { name: 'activity', label: 'Activité', icon: 'activity' },
  { name: 'settings', label: 'Réglages', icon: 'settings' },
];

export default function MerchantTabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TabBar
          {...props}
          items={ITEMS}
          center={{
            label: 'SCAN',
            icon: 'scan',
            tone: 'ink',
            onPress: () => router.push('/(merchant)/scan'),
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="customers" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
