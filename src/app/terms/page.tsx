import { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'TensorFeed.ai terms of service covering acceptable use, intellectual property, content attribution, disclaimers, and limitation of liability.',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Terms of Service</h1>
        </div>
        <p className="text-text-muted text-sm">Last updated: April 6, 2026</p>
      </div>

      <div className="space-y-8 text-text-secondary leading-relaxed">
        {/* Intro */}
        <section>
          <p>
            Welcome to TensorFeed.ai. By accessing or using our website at tensorfeed.ai (the
            &quot;Site&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If
            you do not agree to these Terms, please do not use the Site. TensorFeed.ai is operated by
            Pizza Robot Studios LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
          </p>
        </section>

        {/* Acceptable Use */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Acceptable Use</h2>
          <p className="mb-3">
            You may use TensorFeed.ai for lawful purposes only. When using the Site, you agree not to:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Use the Site in any way that violates applicable laws or regulations</li>
            <li>Attempt to interfere with or disrupt the Site&apos;s infrastructure or services</li>
            <li>Scrape, crawl, or harvest content from the Site in a manner that places undue burden on our servers</li>
            <li>Misrepresent your identity or affiliation when contacting us</li>
            <li>Use the Site to distribute malware, spam, or other harmful content</li>
            <li>Attempt to access areas of the Site or our systems that are not intended for public access</li>
          </ul>
          <p className="mt-3">
            AI agents and automated tools are welcome to access our public API endpoints, RSS feeds, and
            structured data files (llms.txt, feed.json, feed.xml) for legitimate purposes. We ask that
            automated access respect reasonable rate limits and identify itself with a descriptive
            User-Agent header.
          </p>
        </section>

        {/* Intellectual Property */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Intellectual Property and Content Attribution</h2>
          <p className="mb-3">
            TensorFeed.ai aggregates headlines, snippets, and metadata from publicly available RSS feeds
            and APIs published by third-party sources including (but not limited to) Anthropic, OpenAI,
            Google, Meta, TechCrunch, The Verge, Ars Technica, and Hacker News.
          </p>
          <p className="mb-3">
            All aggregated content remains the intellectual property of its original publisher. We display
            brief snippets under fair use principles and always link back to the original source. We do
            not republish full articles or claim ownership of third-party content.
          </p>
          <p className="mb-3">
            Original editorial content published under{' '}
            <Link href="/originals" className="text-accent-primary hover:underline">TensorFeed Originals</Link>{' '}
            is the property of Pizza Robot Studios LLC. You may quote or reference our original content
            with proper attribution and a link back to the source article.
          </p>
          <p>
            The TensorFeed name, logo, and site design are the property of Pizza Robot Studios LLC. You
            may not use our branding without prior written permission.
          </p>
        </section>

        {/* API and Data Use */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">API and Data Usage</h2>
          <p className="mb-3">
            TensorFeed.ai provides free public API endpoints and data feeds for developers and AI agents.
            Use of our API is subject to the following conditions:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>API access is provided as-is with no guaranteed uptime or SLA</li>
            <li>We reserve the right to rate-limit or block abusive usage</li>
            <li>Data obtained from our API should not be resold as a standalone product</li>
            <li>We may modify or discontinue API endpoints at any time</li>
          </ul>
        </section>

        {/* Disclaimers */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Disclaimers</h2>
          <p className="mb-3">
            TensorFeed.ai is an AI news aggregator and informational resource. The content on this Site
            is provided for general informational purposes only.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="text-text-primary font-medium">Not financial advice:</span> Information
              about AI companies, pricing, and market trends is not financial, investment, or trading
              advice. Do not make financial decisions based solely on content from this Site.
            </li>
            <li>
              <span className="text-text-primary font-medium">Not legal advice:</span> Information about
              AI regulations, licensing, and compliance is not legal advice. Consult a qualified attorney
              for legal questions.
            </li>
            <li>
              <span className="text-text-primary font-medium">Accuracy:</span> While we strive for
              accuracy, we cannot guarantee that all information on the Site is complete, current, or
              error-free. AI model pricing, availability, and specifications change frequently. Always
              verify critical information with the original provider.
            </li>
            <li>
              <span className="text-text-primary font-medium">Third-party content:</span> We are not
              responsible for the accuracy or content of third-party sources we aggregate. Follow the links
              to original sources for authoritative information.
            </li>
          </ul>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Limitation of Liability</h2>
          <p className="mb-3">
            To the fullest extent permitted by applicable law, Pizza Robot Studios LLC and its operators
            shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of profits, data, or business opportunities, arising from
            your use of or inability to use the Site.
          </p>
          <p>
            The Site is provided on an &quot;as is&quot; and &quot;as available&quot; basis without
            warranties of any kind, either express or implied, including but not limited to implied
            warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
        </section>

        {/* Indemnification */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Pizza Robot Studios LLC, its operators, and
            affiliates from any claims, damages, losses, or expenses (including reasonable attorney fees)
            arising from your use of the Site or violation of these Terms.
          </p>
        </section>

        {/* Termination */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Termination</h2>
          <p>
            We reserve the right to restrict or terminate access to the Site at our discretion, without
            notice, for any reason, including violation of these Terms.
          </p>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the State of
            California, without regard to its conflict of law provisions. Any disputes arising from these
            Terms or your use of the Site shall be subject to the exclusive jurisdiction of the courts
            located in Los Angeles County, California.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. When we do, we will revise the &quot;Last
            updated&quot; date at the top of this page. Continued use of the Site after changes
            constitutes acceptance of the updated Terms.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Contact</h2>
          <p>
            If you have questions about these Terms of Service, contact us at{' '}
            <a href="mailto:support@tensorfeed.ai" className="text-accent-primary hover:underline">
              support@tensorfeed.ai
            </a>{' '}
            or visit our{' '}
            <Link href="/contact" className="text-accent-primary hover:underline">
              contact page
            </Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
