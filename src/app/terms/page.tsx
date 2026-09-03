import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';

export const metadata: Metadata = {
  title: 'Terms of Service — QarWheel',
  description: 'The terms that govern using QarWheel\'s web and mobile apps as a customer or vendor.',
};

const LAST_UPDATED = '3 September 2026';

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of QarWheel&apos;s website and mobile
        applications (together, the &quot;Service&quot;), operated by QarWheel (&quot;QarWheel&quot;,
        &quot;we&quot;, &quot;us&quot;). By creating an account or using the Service, you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>QarWheel is a marketplace that connects vehicle owners (&quot;Customers&quot;) with independent
        garages and service providers (&quot;Vendors&quot;) for booking, tracking, and paying for vehicle
        service and repair. QarWheel is not itself a garage and does not perform vehicle service — Vendors are
        independent businesses responsible for the quality and safety of the work they perform.</p>

      <h2>2. Accounts</h2>
      <p>You must provide accurate information when creating an account and keep your login credentials
        confidential. You are responsible for activity that occurs under your account. You must be at least 16
        years old to create an account.</p>

      <h2>3. Bookings and payments</h2>
      <ul>
        <li>Booking a service creates a request to a Vendor, who may accept or decline it. A confirmed booking
          is an agreement between you and the Vendor; QarWheel facilitates the booking and payment but is not a
          party to the underlying service agreement.</li>
        <li>Prices shown are set by Vendors and may change if the scope of work changes once your vehicle is
          inspected — you will be shown any revised invoice before it&apos;s finalized wherever possible.</li>
        <li>Payments are processed by our third-party payment processor. QarWheel charges Vendors a commission
          on completed bookings; this does not change the price you pay.</li>
        <li>Cancellation terms are shown at the time of booking and vary by Vendor and how far in advance you
          cancel.</li>
      </ul>

      <h2>4. Vendor obligations</h2>
      <p>Vendors must hold any licenses required to operate in their jurisdiction, accurately represent their
        services and pricing, and complete our KYC (Know Your Customer) verification before receiving payouts.
        QarWheel reserves the right to suspend or remove a Vendor for fraud, repeated customer complaints, or
        violation of these Terms.</p>

      <h2>5. Prohibited conduct</h2>
      <p>You agree not to: use the Service for any unlawful purpose; misrepresent your identity or vehicle
        information; attempt to circumvent the Service to transact directly with a Vendor to avoid fees;
        interfere with or disrupt the Service&apos;s security or availability; or scrape, reverse-engineer, or
        resell access to the Service without our written permission.</p>

      <h2>6. Reviews</h2>
      <p>Reviews must reflect a genuine completed booking. We may remove reviews that are fraudulent, abusive,
        or violate these Terms, but we do not edit review content on a Vendor&apos;s behalf.</p>

      <h2>7. Disclaimers</h2>
      <p>The Service is provided &quot;as is.&quot; QarWheel does not guarantee the quality, safety, or
        legality of services performed by Vendors, and is not liable for the acts or omissions of any Vendor.
        To the maximum extent permitted by law, QarWheel disclaims all warranties, express or implied.</p>

      <h2>8. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, QarWheel&apos;s total liability arising from your use of the
        Service will not exceed the amount you paid to QarWheel (i.e. platform fees, not the underlying service
        cost) in the six months preceding the claim.</p>

      <h2>9. Termination</h2>
      <p>You may stop using the Service and delete your account at any time (see Delete My Account in-app). We
        may suspend or terminate your account for violation of these Terms, fraud, or abuse.</p>

      <h2>10. Changes to these Terms</h2>
      <p>We may update these Terms from time to time. Material changes will be communicated in-app or by email
        before they take effect; continued use of the Service after changes take effect constitutes
        acceptance.</p>

      <h2>11. Governing law</h2>
      <p>These Terms are governed by the laws of the State of Qatar, without regard to conflict-of-law
        principles, pending final confirmation by legal counsel.</p>

      <h2>12. Contact us</h2>
      <p>Questions about these Terms can be sent through the in-app Support Ticket or Contact Us screens.</p>
    </LegalPageLayout>
  );
}
