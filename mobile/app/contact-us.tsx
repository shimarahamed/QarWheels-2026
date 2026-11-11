import { FeatureAvailabilityGate } from '@/components/FeatureAvailabilityGate';

export default function ContactUsScreen() {
  return <FeatureAvailabilityGate routeName="/contact-us">{null}</FeatureAvailabilityGate>;
}
