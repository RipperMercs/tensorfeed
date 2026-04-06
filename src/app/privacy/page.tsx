import { Metadata } from 'next';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'TensorFeed.ai privacy policy covering data collection, cookies, advertising, GDPR compliance, and CCPA compliance.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Privacy Policy</h1>
        </div>
        <p className="text-text-muted text-sm">Last updated: April 6, 2026</p>
      </div>

      <div className="space-y-8 text-text-secondary leading-relaxed">
        {/* Intro */}
        <section>
          <p>
            TensorFeed.ai (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is operated by Pizza Robot
            Studios LLC. We are committed to protecting your privacy and being transparent about how we
            collect and use data. This Privacy Policy explains our practices regarding information
            collection, use, and disclosure when you visit tensorfeed.ai (the &quot;Site&quot;).
          </p>
        </section>

        {/* Data Collection */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Information We Collect</h2>
          <p className="mb-3">
            We aim to keep data collection to a minimum. When you visit TensorFeed.ai, the following
            information may be collected:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="text-text-primary font-medium">Usage data:</span> Pages visited, time spent
              on pages, referral source, browser type, device type, and general geographic region (country
              level). This data is aggregated and anonymized.
            </li>
            <li>
              <span className="text-text-primary font-medium">Email address:</span> Only if you voluntarily
              subscribe to outage alerts or contact us via email.
            </li>
            <li>
              <span className="text-text-primary font-medium">Cookie preferences:</span> Your consent
              choice for cookies is stored locally on your device.
            </li>
          </ul>
          <p className="mt-3">
            We do not require account creation, login, or registration to use TensorFeed.ai. We do not
            collect personal information unless you voluntarily provide it.
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Cookies and Tracking Technologies</h2>
          <p className="mb-3">
            Cookies are small text files stored on your device when you visit a website. TensorFeed.ai uses
            the following types of cookies:
          </p>

          <div className="space-y-4">
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <p className="text-text-primary font-medium mb-1">Essential Cookies</p>
              <p className="text-sm">
                These cookies are necessary for basic site functionality, such as remembering your theme
                preference (light/dark mode) and cookie consent choice. These cookies do not track you
                across websites and are stored only on your device.
              </p>
            </div>

            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <p className="text-text-primary font-medium mb-1">Analytics Cookies</p>
              <p className="text-sm">
                We use Cloudflare Web Analytics to understand how visitors use our site. Cloudflare
                Analytics is privacy-focused and does not use cookies for tracking. It collects aggregated,
                anonymous data such as page views, visit duration, and general location at the country
                level. No personally identifiable information is collected through Cloudflare Analytics.
              </p>
            </div>

            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <p className="text-text-primary font-medium mb-1">Advertising Cookies</p>
              <p className="text-sm">
                We use Google AdSense to display advertisements on our site. Google AdSense may use cookies
                to serve ads based on your prior visits to this site or other websites. Google&apos;s use of
                advertising cookies enables it and its partners to serve ads based on your browsing activity.
                You may opt out of personalized advertising by visiting{' '}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:underline"
                >
                  Google&apos;s Ads Settings
                </a>. Advertising cookies are only loaded after you accept cookies through our cookie
                consent banner.
              </p>
            </div>
          </div>

          <p className="mt-3">
            You can manage or delete cookies through your browser settings at any time. Disabling cookies
            may affect your experience on the site but will not prevent you from accessing content.
          </p>
        </section>

        {/* Third Party Services */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Third-Party Services</h2>

          <div className="space-y-3">
            <p>
              <span className="text-text-primary font-medium">Cloudflare:</span> We use Cloudflare for
              DNS, CDN, security, and web analytics. Cloudflare may process request metadata (IP addresses,
              headers) to provide these services. See{' '}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-primary hover:underline"
              >
                Cloudflare&apos;s Privacy Policy
              </a>.
            </p>
            <p>
              <span className="text-text-primary font-medium">Google AdSense:</span> We use Google AdSense
              to display advertisements. Google may collect and use data to personalize ads. See{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-primary hover:underline"
              >
                Google&apos;s Privacy Policy
              </a>{' '}
              and{' '}
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-primary hover:underline"
              >
                How Google Uses Information from Sites That Use Its Services
              </a>.
            </p>
            <p>
              <span className="text-text-primary font-medium">Resend:</span> If you subscribe to outage
              alerts, we use Resend as our email delivery provider. Your email address is stored securely
              and used only to send the alerts you requested. See{' '}
              <a
                href="https://resend.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-primary hover:underline"
              >
                Resend&apos;s Privacy Policy
              </a>.
            </p>
          </div>
        </section>

        {/* How We Use Data */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">How We Use Your Data</h2>
          <p className="mb-3">We use the data we collect to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Provide and maintain our services</li>
            <li>Understand how visitors use the site so we can improve it</li>
            <li>Send outage alerts to subscribers who opted in</li>
            <li>Display relevant advertisements through Google AdSense</li>
            <li>Respond to inquiries sent to our contact email</li>
          </ul>
        </section>

        {/* Data Sales */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            We Do Not Sell Your Data
          </h2>
          <p>
            We do not sell, rent, or trade any personal information to third parties. We do not share
            your data with anyone except the third-party service providers listed above, and only as
            necessary to operate the site.
          </p>
        </section>

        {/* GDPR */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            European Users (GDPR Compliance)
          </h2>
          <p className="mb-3">
            If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you
            have the following rights under the General Data Protection Regulation (GDPR):
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><span className="text-text-primary font-medium">Right to access:</span> You can request a copy of any personal data we hold about you.</li>
            <li><span className="text-text-primary font-medium">Right to rectification:</span> You can request correction of inaccurate personal data.</li>
            <li><span className="text-text-primary font-medium">Right to erasure:</span> You can request deletion of your personal data.</li>
            <li><span className="text-text-primary font-medium">Right to restrict processing:</span> You can request that we limit how we use your data.</li>
            <li><span className="text-text-primary font-medium">Right to data portability:</span> You can request your data in a machine-readable format.</li>
            <li><span className="text-text-primary font-medium">Right to object:</span> You can object to our processing of your personal data.</li>
            <li><span className="text-text-primary font-medium">Right to withdraw consent:</span> You can withdraw cookie consent at any time by clearing your browser cookies or using our cookie consent banner.</li>
          </ul>
          <p className="mt-3">
            Our legal basis for processing data is legitimate interest (site analytics) and consent
            (advertising cookies). Advertising cookies are only loaded after you provide consent through
            our cookie banner.
          </p>
          <p className="mt-3">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:support@tensorfeed.ai" className="text-accent-primary hover:underline">
              support@tensorfeed.ai
            </a>.
          </p>
        </section>

        {/* CCPA */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            California Users (CCPA Compliance)
          </h2>
          <p className="mb-3">
            If you are a California resident, you have the following rights under the California Consumer
            Privacy Act (CCPA):
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><span className="text-text-primary font-medium">Right to know:</span> You can request information about what personal data we collect and how we use it.</li>
            <li><span className="text-text-primary font-medium">Right to delete:</span> You can request deletion of personal data we have collected.</li>
            <li><span className="text-text-primary font-medium">Right to opt out:</span> You can opt out of the sale of personal data. We do not sell personal data.</li>
            <li><span className="text-text-primary font-medium">Right to non-discrimination:</span> We will not discriminate against you for exercising your CCPA rights.</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:support@tensorfeed.ai" className="text-accent-primary hover:underline">
              support@tensorfeed.ai
            </a>.
          </p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Data Retention</h2>
          <p>
            Analytics data is retained in aggregated, anonymized form. Email addresses for alert
            subscribers are retained until the subscriber requests removal. Correspondence sent to our
            contact email is retained as needed to resolve inquiries. Cookie consent preferences are
            stored locally on your device and can be cleared through your browser settings.
          </p>
        </section>

        {/* RSS and Public Data */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            RSS Feeds and Aggregated Content
          </h2>
          <p>
            TensorFeed.ai aggregates publicly available information from RSS feeds, public APIs, and
            other open sources. All aggregated content is used under fair use principles. We provide
            attribution and link back to original sources. If you are a content owner and have
            concerns about how your content appears on TensorFeed.ai, please contact us at{' '}
            <a href="mailto:support@tensorfeed.ai" className="text-accent-primary hover:underline">
              support@tensorfeed.ai
            </a>{' '}
            and we will address it promptly.
          </p>
        </section>

        {/* Children */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Children&apos;s Privacy
          </h2>
          <p>
            TensorFeed.ai is not directed at children under the age of 13 (or 16 in the EEA). We do
            not knowingly collect personal information from children. If you believe a child has provided
            us with personal data, please contact us so we can delete it.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. When we do, we will revise the
            &quot;Last updated&quot; date at the top of this page. Continued use of the site after
            changes constitutes acceptance of the updated policy. We encourage you to review this policy
            periodically.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or how we handle your data, you can
            reach us at:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2 mt-3">
            <li>
              Email:{' '}
              <a href="mailto:support@tensorfeed.ai" className="text-accent-primary hover:underline">
                support@tensorfeed.ai
              </a>
            </li>
            <li>
              <Link href="/contact" className="text-accent-primary hover:underline">
                Contact page
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
