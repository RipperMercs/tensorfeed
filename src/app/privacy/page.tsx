import { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
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
        <p className="text-text-muted text-sm">Effective date: March 28, 2026</p>
      </div>

      <div className="space-y-8 text-text-secondary leading-relaxed">
        {/* Intro */}
        <section>
          <p>
            TensorFeed.ai is operated by Pizza Robot Studios LLC. We believe in being straightforward
            about how we handle your data. This policy explains what we collect, what we do with it,
            and your rights as a visitor.
          </p>
        </section>

        {/* Data Collection */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">What Data We Collect</h2>
          <p className="mb-3">
            We keep data collection to a minimum. By default, TensorFeed.ai does not set any
            cookies on your browser. We use Cloudflare for hosting and performance, which means
            Cloudflare may collect basic analytics data such as page views, country-level location,
            and browser type. This data is aggregated and anonymous. We do not track individual
            users across sessions.
          </p>
          <p>
            We do not require account creation or login to use TensorFeed.ai. If you contact us via
            email, we will retain that correspondence to respond to your inquiry.
          </p>
        </section>

        {/* Third Party Services */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Third-Party Services</h2>
          <p className="mb-3">
            <span className="text-text-primary font-medium">Cloudflare:</span> We use Cloudflare
            for DNS, CDN, and DDoS protection. Cloudflare may process request metadata (IP
            addresses, headers) to provide these services. You can review{' '}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              Cloudflare&apos;s privacy policy
            </a>{' '}
            for more details.
          </p>
          <p>
            <span className="text-text-primary font-medium">Google AdSense:</span> We may integrate
            Google AdSense for advertising in the future. If and when AdSense is added, it may use
            cookies to serve ads based on your browsing activity. At that point, we will update this
            policy and provide appropriate consent mechanisms as required by applicable law.
          </p>
        </section>

        {/* Data Sales */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            We Do Not Sell Your Data
          </h2>
          <p>
            We do not sell, rent, or trade any personal information to third parties. Period.
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
            concerns about how your content appears on TensorFeed.ai, please contact us and we will
            address it promptly.
          </p>
        </section>

        {/* Children */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Children&apos;s Privacy
          </h2>
          <p>
            TensorFeed.ai is not directed at children under the age of 13. We do not knowingly
            collect personal information from children.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. When we do, we will revise the
            effective date at the top of this page. We encourage you to review this policy
            periodically.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Contact</h2>
          <p>
            If you have any questions about this privacy policy, you can reach us at{' '}
            <a
              href="mailto:evan@pizzarobotstudios.com"
              className="text-accent-primary hover:underline"
            >
              evan@pizzarobotstudios.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
