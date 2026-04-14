import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-accent-primary mb-4 font-mono">404</div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Page not found
        </h1>
        <p className="text-text-secondary mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-medium"
          >
            Back to Home
          </Link>
          <Link
            href="/status"
            className="px-6 py-2.5 border border-border text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors font-medium"
          >
            Check Status
          </Link>
        </div>
      </div>
    </div>
  );
}
