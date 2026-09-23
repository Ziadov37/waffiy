import { Tabs, useRouter } from 'expo-router';

import { TabBar, type TabItem } from '@/components/ui';
import { useStaffSessionStore } from '@/stores/staff-session';

const ITEMS: readonly TabItem[] = [
  { name: 'index', label: 'Accueil', icon: 'home' },
  { name: 'customers', label: 'Clients', icon: 'users' },
  { name: 'activity', label: 'Activité', icon: 'activity' },
  { name: 'settings', label: 'Réglages', icon: 'settings' },
];

export default function MerchantTabsLayout() {
  const router = useRouter();
  const staffSession = useStaffSessionStore((state) => state.session);
  const items = staffSession ? ITEMS.slice(0, 1) : ITEMS;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TabBar
          {...props}
          items={items}
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
      <Tabs.Screen name="customers" options={staffSession ? { href: null } : {}} />
      <Tabs.Screen name="activity" options={staffSession ? { href: null } : {}} />
      <Tabs.Screen name="settings" options={staffSession ? { href: null } : {}} />
    </Tabs>
  );
}
