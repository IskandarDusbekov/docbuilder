import { router } from 'expo-router';

import { Onboarding } from '@/components/onboarding';

// "Ilova haqida"dan tanishtiruvni qayta ko'rish uchun.
export default function WelcomeScreen() {
  return <Onboarding onDone={() => router.back()} />;
}
