import { useRouter } from 'expo-router';
import { AuthScreen, BrandMark, OptionCard, PrimaryButton, StepHeader } from '@/components/auth-flow';
import { useTranslation } from '@/lib/i18n';
import { promptRestartForRTL } from '@/lib/i18n/restart';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, changeLanguage } = useTranslation();

  // Selecting a language here persists it immediately, so the rest of
  // onboarding is already translated. Switching to Arabic flips the layout
  // direction, which only takes effect after a restart.
  const select = async (next: 'en' | 'ar') => {
    const needsRestart = changeLanguage(next);
    if (needsRestart) await promptRestartForRTL();
  };

  return (
    <AuthScreen
      footer={
        <PrimaryButton
          label="Continue"
          icon="arrow-forward"
          onPress={() => router.push('/(auth)/appearance' as never)}
        />
      }
    >
      <BrandMark compact />
      <StepHeader
        eyebrow="Step 1"
        title="Choose your language"
        body="Select the language you want to use across QarWheel."
        icon="language-outline"
      />
      <OptionCard
        title="English"
        body="Use QarWheel in English."
        icon={language === 'en' ? 'checkmark-circle' : 'ellipse-outline'}
        selected={language === 'en'}
        onPress={() => void select('en')}
      />
      <OptionCard
        title="العربية"
        body="استخدم QarWheel باللغة العربية."
        icon={language === 'ar' ? 'checkmark-circle' : 'ellipse-outline'}
        selected={language === 'ar'}
        onPress={() => void select('ar')}
      />
    </AuthScreen>
  );
}
