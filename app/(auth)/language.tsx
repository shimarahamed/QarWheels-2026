import { useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthScreen, BrandMark, OptionCard, PrimaryButton, StepHeader } from '@/components/auth-flow';

export default function LanguageScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  return (
    <AuthScreen
      footer={
        <PrimaryButton
          label="Continue"
          icon="arrow-forward"
          onPress={() => router.push('/(auth)/welcome' as never)}
        />
      }
    >
      <BrandMark compact />
      <StepHeader
        eyebrow="Step 1"
        title="Choose your language"
        body="Select the language you want to use across QarWheels."
        icon="language-outline"
      />
      <OptionCard
        title="English"
        body="Use QarWheels in English."
        icon="checkmark-circle-outline"
        selected={language === 'en'}
        onPress={() => setLanguage('en')}
      />
      <OptionCard
        title="Arabic"
        body="Arabic language experience."
        icon="ellipse-outline"
        selected={language === 'ar'}
        onPress={() => setLanguage('ar')}
      />
    </AuthScreen>
  );
}
