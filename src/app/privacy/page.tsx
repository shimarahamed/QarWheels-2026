import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';

export const metadata: Metadata = {
  title: 'Privacy Policy — QarWheel',
  description: 'How QarWheel collects, uses, and shares information across the web and mobile apps.',
};

const LAST_UPDATED = '3 September 2026';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy explains how QarWheel (&quot;QarWheel&quot;, &quot;we&quot;, &quot;us&quot;) collects,
        uses, and shares information when you use our website and mobile applications (together, the
        &quot;Service&quot;) to find, book, and pay for vehicle service and repair.
      </p>

      <h2>1. Information we collect</h2>
      <p><strong>Account information.</strong> Name, email address, phone number, and password (stored as a
        hash, never in plain text) when you create an account.</p>
      <p><strong>Vehicle information.</strong> VIN, make, model, year, mileage, and service history you add to
        your garage.</p>
      <p><strong>Booking and payment information.</strong> Service bookings, invoices, and payment method
        details. Full card numbers are handled by our payment processor and never stored on our servers; we
        retain only the last four digits and card brand for your reference.</p>
      <p><strong>Location information.</strong> With your permission, your device&apos;s approximate or precise
        location, used to show nearby garages and estimate travel time.</p>
      <p><strong>Communications.</strong> Messages you send to garages or our support team through in-app chat,
        and any documents you upload (e.g. KYC documents for vendor accounts, damage-report photos).</p>
      <p><strong>Usage information.</strong> Pages viewed, features used, and device/app diagnostics, collected
        automatically to keep the Service reliable and secure.</p>

      <h2>2. How we use information</h2>
      <ul>
        <li>To create and maintain your account, and to let you book and manage vehicle services.</li>
        <li>To connect you with garages and process payments and payouts.</li>
        <li>To send booking confirmations, status updates, and — where you&apos;ve opted in — service reminders
          and promotional offers.</li>
        <li>To detect, investigate, and prevent fraud, abuse, and security incidents.</li>
        <li>To comply with legal obligations, including tax and financial record-keeping requirements for
          completed transactions.</li>
      </ul>

      <h2>3. How we share information</h2>
      <p><strong>With garages you book with.</strong> Your name, contact details, vehicle information, and
        booking details are shared with the garage handling your booking, so they can perform the service and
        communicate with you.</p>
      <p><strong>With service providers.</strong> Payment processing, cloud hosting, and analytics providers who
        process data on our behalf, under contractual confidentiality obligations, only to the extent needed to
        provide the Service.</p>
      <p><strong>For legal reasons.</strong> Where required by law, to protect our rights, or to respond to a
        valid legal process.</p>
      <p><strong>We do not sell your personal information.</strong></p>

      <h2>4. Data retention</h2>
      <p>We retain account information for as long as your account is active. When you delete your account:</p>
      <ul>
        <li>Your login credentials and personal profile details (name, email, phone, saved addresses, payment
          methods) are permanently deleted.</li>
        <li>Bookings, invoices, and transaction records connected to your account are <strong>retained</strong>,
          with your name and contact details replaced with a generic placeholder — this is necessary to
          preserve garages&apos; service records and the financial/audit trail for completed payments, which
          we&apos;re required to keep for tax and accounting purposes.</li>
      </ul>
      <p>You can start this process from your account&apos;s Delete My Account option, on web or mobile.</p>

      <h2>5. Your rights</h2>
      <p>Depending on where you live, you may have the right to access, correct, or delete your personal
        information, or to object to certain processing. You can access and update most of your information
        directly in the app, and request account deletion at any time from Profile → Delete My Account (web)
        or Account → Privacy &amp; Security → Delete My Account (mobile).</p>

      <h2>6. Security</h2>
      <p>We use industry-standard measures — encryption in transit, access controls, and rate limiting — to
        protect your information. No system is perfectly secure, and we encourage you to use a strong, unique
        password.</p>

      <h2>7. Children&apos;s privacy</h2>
      <p>The Service is not directed to children under 16, and we do not knowingly collect personal information
        from children under 16.</p>

      <h2>8. Changes to this policy</h2>
      <p>We may update this Privacy Policy from time to time. Material changes will be communicated in-app or
        by email before they take effect.</p>

      <h2>9. Contact us</h2>
      <p>Questions about this Privacy Policy can be sent through the in-app Support Ticket or Contact Us
        screens.</p>
    </LegalPageLayout>
  );
}
