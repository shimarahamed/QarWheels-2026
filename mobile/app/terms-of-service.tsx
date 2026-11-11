import { LegalDocument, type LegalSection } from '@/components/LegalDocument';

const LAST_UPDATED = '3 September 2026';

const INTRO =
  'These Terms of Service ("Terms") govern your use of QarWheel’s website and mobile applications ' +
  '(together, the "Service"), operated by QarWheel ("QarWheel", "we", "us"). By creating an account or ' +
  'using the Service, you agree to these Terms.';

const SECTIONS: LegalSection[] = [
  {
    heading: '1. The Service',
    body: [
      'QarWheel is a marketplace that connects vehicle owners ("Customers") with independent garages and service providers ("Vendors") for booking, tracking, and paying for vehicle service and repair. QarWheel is not itself a garage and does not perform vehicle service — Vendors are independent businesses responsible for the quality and safety of the work they perform.',
    ],
  },
  {
    heading: '2. Accounts',
    body: [
      'You must provide accurate information when creating an account and keep your login credentials confidential. You are responsible for activity that occurs under your account. You must be at least 16 years old to create an account.',
    ],
  },
  {
    heading: '3. Bookings and payments',
    body: [
      'Booking a service creates a request to a Vendor, who may accept or decline it. A confirmed booking is an agreement between you and the Vendor; QarWheel facilitates the booking and payment but is not a party to the underlying service agreement.',
      'Prices shown are set by Vendors and may change if the scope of work changes once your vehicle is inspected — you will be shown any revised invoice before it’s finalized wherever possible.',
      'Payments are processed by our third-party payment processor. QarWheel charges Vendors a commission on completed bookings; this does not change the price you pay.',
      'Cancellation terms are shown at the time of booking and vary by Vendor and how far in advance you cancel.',
    ],
  },
  {
    heading: '4. Vendor obligations',
    body: [
      'Vendors must hold any licenses required to operate in their jurisdiction, accurately represent their services and pricing, and complete our KYC (Know Your Customer) verification before receiving payouts. QarWheel reserves the right to suspend or remove a Vendor for fraud, repeated customer complaints, or violation of these Terms.',
    ],
  },
  {
    heading: '5. Prohibited conduct',
    body: [
      'You agree not to: use the Service for any unlawful purpose; misrepresent your identity or vehicle information; attempt to circumvent the Service to transact directly with a Vendor to avoid fees; interfere with or disrupt the Service’s security or availability; or scrape, reverse-engineer, or resell access to the Service without our written permission.',
    ],
  },
  {
    heading: '6. Reviews',
    body: [
      'Reviews must reflect a genuine completed booking. We may remove reviews that are fraudulent, abusive, or violate these Terms, but we do not edit review content on a Vendor’s behalf.',
    ],
  },
  {
    heading: '7. Disclaimers',
    body: [
      'The Service is provided "as is." QarWheel does not guarantee the quality, safety, or legality of services performed by Vendors, and is not liable for the acts or omissions of any Vendor. To the maximum extent permitted by law, QarWheel disclaims all warranties, express or implied.',
    ],
  },
  {
    heading: '8. Limitation of liability',
    body: [
      'To the maximum extent permitted by law, QarWheel’s total liability arising from your use of the Service will not exceed the amount you paid to QarWheel (i.e. platform fees, not the underlying service cost) in the six months preceding the claim.',
    ],
  },
  {
    heading: '9. Termination',
    body: [
      'You may stop using the Service and delete your account at any time (see Delete My Account in-app). We may suspend or terminate your account for violation of these Terms, fraud, or abuse.',
    ],
  },
  {
    heading: '10. Changes to these Terms',
    body: [
      'We may update these Terms from time to time. Material changes will be communicated in-app or by email before they take effect; continued use of the Service after changes take effect constitutes acceptance.',
    ],
  },
  {
    heading: '11. Governing law',
    body: [
      'These Terms are governed by the laws of the State of Qatar, without regard to conflict-of-law principles, pending final confirmation by legal counsel.',
    ],
  },
  {
    heading: '12. Contact us',
    body: [
      'Questions about these Terms can be sent through the in-app Support Ticket or Contact Us screens.',
    ],
  },
];

export default function TermsOfServiceScreen() {
  return (
    <LegalDocument title="Terms of Service" lastUpdated={LAST_UPDATED} intro={INTRO} sections={SECTIONS} />
  );
}
