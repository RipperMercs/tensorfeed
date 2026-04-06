import { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageSquare, Bug, Newspaper } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the TensorFeed.ai team. Reach out for feedback, press inquiries, support, or partnership opportunities.',
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Contact Us</h1>
        </div>
        <p className="text-text-secondary text-lg">
          We read every message. Here&apos;s how to reach the right inbox.
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid gap-6 sm:grid-cols-2 mb-12">
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-primary/10">
              <MessageSquare className="w-5 h-5 text-accent-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">General Feedback</h2>
          </div>
          <p className="text-text-secondary text-sm mb-4">
            Feature requests, suggestions, or anything else on your mind about TensorFeed.
          </p>
          <a
            href="mailto:feedback@tensorfeed.ai"
            className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-secondary transition-colors font-medium text-sm"
          >
            <Mail className="w-4 h-4" />
            feedback@tensorfeed.ai
          </a>
        </div>

        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-primary/10">
              <Bug className="w-5 h-5 text-accent-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Support</h2>
          </div>
          <p className="text-text-secondary text-sm mb-4">
            Bug reports, data accuracy issues, alert subscription problems, or technical questions.
          </p>
          <a
            href="mailto:support@tensorfeed.ai"
            className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-secondary transition-colors font-medium text-sm"
          >
            <Mail className="w-4 h-4" />
            support@tensorfeed.ai
          </a>
        </div>

        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-primary/10">
              <Newspaper className="w-5 h-5 text-accent-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Press Inquiries</h2>
          </div>
          <p className="text-text-secondary text-sm mb-4">
            Media requests, interviews, or press-related questions about TensorFeed or Pizza Robot Studios.
          </p>
          <a
            href="mailto:press@tensorfeed.ai"
            className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-secondary transition-colors font-medium text-sm"
          >
            <Mail className="w-4 h-4" />
            press@tensorfeed.ai
          </a>
        </div>

        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-primary/10">
              <Mail className="w-5 h-5 text-accent-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">General Contact</h2>
          </div>
          <p className="text-text-secondary text-sm mb-4">
            Partnerships, sponsorships, content removal requests, or anything that doesn&apos;t fit the
            other categories.
          </p>
          <a
            href="mailto:contact@tensorfeed.ai"
            className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-secondary transition-colors font-medium text-sm"
          >
            <Mail className="w-4 h-4" />
            contact@tensorfeed.ai
          </a>
        </div>
      </div>

      {/* Additional Info */}
      <div className="border-t border-border pt-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Social</h2>
          <p className="text-text-secondary text-sm">
            Follow us on X/Twitter at{' '}
            <a
              href="https://x.com/tensorfeed"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              @tensorfeed
            </a>{' '}
            for the latest updates and announcements.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">For Developers and AI Agents</h2>
          <p className="text-text-secondary text-sm">
            If you are building on top of TensorFeed&apos;s data, check out our{' '}
            <Link href="/developers" className="text-accent-primary hover:underline">
              developer documentation
            </Link>{' '}
            for API endpoints, RSS feeds, and structured data files. Our APIs are free and open for
            legitimate use.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Response Time</h2>
          <p className="text-text-secondary text-sm">
            We aim to respond to all emails within 48 hours. For urgent matters (data accuracy issues,
            content removal requests), we prioritize faster responses.
          </p>
        </div>

        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <p className="text-text-primary font-medium mb-2">Pizza Robot Studios LLC</p>
          <p className="text-text-secondary text-sm">
            3705 W Pico Blvd #B<br />
            Los Angeles, CA 90019
          </p>
        </div>
      </div>
    </div>
  );
}
