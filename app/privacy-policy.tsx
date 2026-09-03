import { LegalDocument, type LegalSection } from '@/components/LegalDocument';

const LAST_UPDATED = '3 September 2026';

const INTRO =
  'This Privacy Policy explains how QarWheel ("QarWheel", "we", "us") collects, uses, and shares ' +
  'information when you use our website and mobile applications (together, the "Service") to find, ' +
  'book, and pay for vehicle service and repair.';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. Information we collect',
    body: [
      'Account information. Name, email address, phone number, and password (stored as a hash, never in plain text) when you create an account.',
      'Vehicle information. VIN, make, model, year, mileage, and service history you add to your garage.',
      'Booking and payment information. Service bookings, invoices, and payment method details. Full card numbers are handled by our payment processor and never stored on our servers; we retain only the last four digits and card brand for your reference.',
      'Location information. With your permission, your device’s approximate or precise location, used to show nearby garages and estimate travel time.',
      'Communications. Messages you send to garages or our support team through in-app chat, and any documents you upload (e.g. KYC documents for vendor accounts, damage-report photos).',
      'Usage information. Pages viewed, features used, and device/app diagnostics, collected automatically to keep the Service reliable and secure.',
    ],
  },
  {
    heading: '2. How we use information',
    body: [
      'To create and maintain your account, and to let you book and manage vehicle services.',
      'To connect you with garages and process payments and payouts.',
      'To send booking confirmations, status updates, and — where you’ve opted in — service reminders and promotional offers.',
      'To detect, investigate, and prevent fraud, abuse, and security incidents.',
      'To comply with legal obligations, including tax and financial record-keeping requirements for completed transactions.',
    ],
  },
  {
    heading: '3. How we share information',
    body: [
      'With garages you book with. Your name, contact details, vehicle information, and booking details are shared with the garage handling your booking, so they can perform the service and communicate with you.',
      'With service providers. Payment processing, cloud hosting, and analytics providers who process data on our behalf, under contractual confidentiality obligations, only to the extent needed to provide the Service.',
      'For legal reasons. Where required by law, to protect our rights, or to respond to a valid legal process.',
      'We do not sell your personal information.',
    ],
  },
  {
    heading: '4. Data retention',
    body: [
      'We retain account information for as long as your account is active. When you delete your account, your login credentials and personal profile details (name, email, phone, saved addresses, payment methods) are permanently deleted.',
      'Bookings, invoices, and transaction records connected to your account are retained, with your name and contact details replaced with a generic placeholder — this is necessary to preserve garages’ service records and the financial/audit trail for completed payments, which we’re required to keep for tax and accounting purposes.',
      'You can start this process from Account → Privacy & Security → Delete My Account.',
    ],
  },
  {
    heading: '5. Your rights',
    body: [
      'Depending on where you live, you may have the right to access, correct, or delete your personal information, or to object to certain processing. You can access and update most of your information directly in the app, and request account deletion at any time.',
    ],
  },
  {
    heading: '6. Security',
    body: [
      'We use industry-standard measures — encryption in transit, access controls, and rate limiting — to protect your information. No system is perfectly secure, and we encourage you to use a strong, unique password.',
    ],
  },
  {
    heading: '7. Children’s privacy',
    body: [
      'The Service is not directed to children under 16, and we do not knowingly collect personal information from children under 16.',
    ],
  },
  {
    heading: '8. Changes to this policy',
    body: [
      'We may update this Privacy Policy from time to time. Material changes will be communicated in-app or by email before they take effect.',
    ],
  },
  {
    heading: '9. Contact us',
    body: [
      'Questions about this Privacy Policy can be sent through the in-app Support Ticket or Contact Us screens.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated={LAST_UPDATED} intro={INTRO} sections={SECTIONS} />
  );
}
