import { FeatureAvailabilityGate } from '@/components/FeatureAvailabilityGate';

export default function SupportTicketScreen() {
  return <FeatureAvailabilityGate routeName="/support-ticket">{null}</FeatureAvailabilityGate>;
}
