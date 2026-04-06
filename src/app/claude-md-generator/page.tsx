'use client';

import { useState, useMemo } from 'react';
import { FileCode2, Copy, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const FRAMEWORKS = [
  'Next.js',
  'React',
  'Vue',
  'Svelte',
  'Express',
  'FastAPI',
  'Django',
  'Flask',
  'React Native',
  'Cloudflare Workers',
  'Other',
] as const;

const LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Go',
  'Rust',
  'Other',
] as const;

const STYLING_OPTIONS = [
  'Tailwind CSS',
  'CSS Modules',
  'Styled Components',
  'Plain CSS',
  'N/A',
] as const;

const DATABASES = [
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Firebase',
  'Supabase',
  'Cloudflare D1/KV',
  'SQLite',
  'None',
] as const;

const HOSTING_OPTIONS = [
  'Vercel',
  'Cloudflare',
  'AWS',
  'GCP',
  'Netlify',
  'Railway',
  'Self-hosted',
  'Other',
] as const;

const TESTING_OPTIONS = ['Jest', 'Vitest', 'pytest', 'None'] as const;

function getCommonCommands(
  framework: string,
  language: string,
  testing: string
): string {
  const commands: string[] = [];

  switch (framework) {
    case 'Next.js':
      commands.push(
        '- `npm run dev`: Start the development server',
        '- `npm run build`: Create a production build',
        '- `npm run start`: Run the production server',
        '- `npm run lint`: Run ESLint'
      );
      break;
    case 'React':
      commands.push(
        '- `npm run dev`: Start the development server',
        '- `npm run build`: Create a production build',
        '- `npm run lint`: Run ESLint'
      );
      break;
    case 'Vue':
      commands.push(
        '- `npm run dev`: Start the development server',
        '- `npm run build`: Create a production build',
        '- `npm run lint`: Run the linter'
      );
      break;
    case 'Svelte':
      commands.push(
        '- `npm run dev`: Start the development server',
        '- `npm run build`: Create a production build',
        '- `npm run check`: Run Svelte checks'
      );
      break;
    case 'Express':
      commands.push(
        '- `npm run dev`: Start the development server',
        '- `npm run start`: Start in production mode'
      );
      break;
    case 'FastAPI':
      commands.push(
        '- `uvicorn main:app --reload`: Start the development server',
        '- `pip install -r requirements.txt`: Install dependencies'
      );
      break;
    case 'Django':
      commands.push(
        '- `python manage.py runserver`: Start the development server',
        '- `python manage.py migrate`: Run database migrations',
        '- `pip install -r requirements.txt`: Install dependencies'
      );
      break;
    case 'Flask':
      commands.push(
        '- `flask run --debug`: Start the development server',
        '- `pip install -r requirements.txt`: Install dependencies'
      );
      break;
    case 'React Native':
      commands.push(
        '- `npx expo start`: Start the Expo development server',
        '- `npx expo run:ios`: Run on iOS simulator',
        '- `npx expo run:android`: Run on Android emulator'
      );
      break;
    case 'Cloudflare Workers':
      commands.push(
        '- `npx wrangler dev`: Start the local development server',
        '- `npx wrangler deploy`: Deploy to Cloudflare'
      );
      break;
    default:
      commands.push('- `npm run dev`: Start the development server');
      break;
  }

  if (testing !== 'None') {
    switch (testing) {
      case 'Jest':
        commands.push(
          '- `npm run test`: Run the test suite',
          '- `npm run test:watch`: Run tests in watch mode'
        );
        break;
      case 'Vitest':
        commands.push(
          '- `npm run test`: Run the test suite',
          '- `npm run test:watch`: Run tests in watch mode'
        );
        break;
      case 'pytest':
        commands.push(
          '- `python -m pytest`: Run the test suite',
          '- `python -m pytest -v`: Run tests with verbose output'
        );
        break;
    }
  }

  return commands.join('\n');
}

function generateClaudeMd(config: {
  projectName: string;
  framework: string;
  language: string;
  styling: string;
  database: string;
  hosting: string;
  testing: string;
  strictMode: boolean;
  additionalRules: string;
}): string {
  const sections: string[] = [];

  // Header
  sections.push(`# ${config.projectName || 'My Project'}`);

  // Overview
  sections.push(
    `\n## Project Overview\n${config.projectName || 'My Project'} is built with ${config.framework} using ${config.language}.`
  );

  // Stack
  const stackItems: string[] = [];
  stackItems.push(`- Framework: ${config.framework}`);
  stackItems.push(`- Language: ${config.language}`);
  if (config.styling !== 'N/A') {
    stackItems.push(`- Styling: ${config.styling}`);
  }
  if (config.database !== 'None') {
    stackItems.push(`- Database: ${config.database}`);
  }
  stackItems.push(`- Hosting: ${config.hosting}`);
  if (config.testing !== 'None') {
    stackItems.push(`- Testing: ${config.testing}`);
  }
  sections.push(`\n## Stack\n${stackItems.join('\n')}`);

  // Common Commands
  const commands = getCommonCommands(
    config.framework,
    config.language,
    config.testing
  );
  sections.push(`\n## Common Commands\n${commands}`);

  // Code Style
  const styleRules: string[] = [];
  if (
    config.language === 'TypeScript' ||
    config.language === 'JavaScript'
  ) {
    if (config.strictMode && config.language === 'TypeScript') {
      styleRules.push('- TypeScript strict mode enabled; avoid using `any` types');
    }
    styleRules.push('- Use functional components with hooks (React/Next.js)');
    styleRules.push('- Prefer `const` over `let`; never use `var`');
    styleRules.push('- Use arrow functions for callbacks');
  } else if (config.language === 'Python') {
    styleRules.push('- Follow PEP 8 style guidelines');
    styleRules.push('- Use type hints for function signatures');
    styleRules.push('- Prefer f-strings for string formatting');
  } else if (config.language === 'Go') {
    styleRules.push('- Follow standard Go formatting (gofmt)');
    styleRules.push('- Handle all errors explicitly');
    styleRules.push('- Use descriptive variable names');
  } else if (config.language === 'Rust') {
    styleRules.push('- Follow Rust naming conventions (snake_case for functions, CamelCase for types)');
    styleRules.push('- Handle Result and Option types properly');
    styleRules.push('- Prefer borrowing over cloning when possible');
  }

  if (config.styling === 'Tailwind CSS') {
    styleRules.push('- Use Tailwind utility classes for styling');
  } else if (config.styling === 'CSS Modules') {
    styleRules.push('- Use CSS Modules for component-scoped styles');
  } else if (config.styling === 'Styled Components') {
    styleRules.push('- Use Styled Components for styling');
  }

  styleRules.push('- Write clear, descriptive commit messages');
  styleRules.push('- Keep functions small and focused on a single responsibility');

  sections.push(`\n## Code Style\n${styleRules.join('\n')}`);

  // Additional Rules
  if (config.additionalRules.trim()) {
    sections.push(
      `\n## Additional Rules\n${config.additionalRules.trim()}`
    );
  }

  // Footer note
  sections.push(
    `\n## Notes\nThis CLAUDE.md was generated with TensorFeed.ai. Update this file as your project evolves: add new commands, refine style rules, and document conventions as they emerge.`
  );

  return sections.join('\n');
}

export default function ClaudeMdGeneratorPage() {
  const [projectName, setProjectName] = useState('');
  const [framework, setFramework] = useState('Next.js');
  const [language, setLanguage] = useState('TypeScript');
  const [styling, setStyling] = useState('Tailwind CSS');
  const [database, setDatabase] = useState('None');
  const [hosting, setHosting] = useState('Vercel');
  const [testing, setTesting] = useState('None');
  const [strictMode, setStrictMode] = useState(true);
  const [additionalRules, setAdditionalRules] = useState('');
  const [copied, setCopied] = useState(false);

  const generated = useMemo(
    () =>
      generateClaudeMd({
        projectName,
        framework,
        language,
        styling,
        database,
        hosting,
        testing,
        strictMode,
        additionalRules,
      }),
    [
      projectName,
      framework,
      language,
      styling,
      database,
      hosting,
      testing,
      strictMode,
      additionalRules,
    ]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in the preview
    }
  };

  const selectClasses =
    'w-full bg-bg-tertiary border border-border text-text-primary rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors';

  const labelClasses = 'block text-sm font-medium text-text-secondary mb-1.5';

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'CLAUDE.md Generator',
            description:
              'Generate a custom CLAUDE.md file for your project. Select your stack, preferences, and coding style to create the perfect Claude Code configuration.',
            url: 'https://tensorfeed.ai/claude-md-generator',
            publisher: {
              '@type': 'Organization',
              name: 'TensorFeed.ai',
              url: 'https://tensorfeed.ai',
            },
          }),
        }}
      />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-accent-primary/10 border border-accent-primary/20">
              <FileCode2 className="w-6 h-6 text-accent-primary" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary">
              CLAUDE.md Generator
            </h1>
          </div>
          <p className="text-text-secondary max-w-2xl">
            Build a custom CLAUDE.md configuration file for your project in
            seconds. Select your stack, set your preferences, and copy the
            result directly into your repo.
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <Link
              href="/claude-md-guide"
              className="text-accent-primary hover:text-accent-secondary transition-colors inline-flex items-center gap-1"
            >
              Read the full guide <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/claude-md-examples"
              className="text-accent-primary hover:text-accent-secondary transition-colors inline-flex items-center gap-1"
            >
              Browse examples <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-5">
            <div className="bg-bg-secondary rounded-xl border border-border p-6 space-y-5">
              <h2 className="text-lg font-semibold text-text-primary">
                Project Configuration
              </h2>

              {/* Project Name */}
              <div>
                <label htmlFor="projectName" className={labelClasses}>
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  placeholder="My Awesome Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={selectClasses}
                  aria-label="Project name"
                />
              </div>

              {/* Framework */}
              <div>
                <label htmlFor="framework" className={labelClasses}>
                  Framework
                </label>
                <select
                  id="framework"
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className={selectClasses}
                  aria-label="Framework"
                >
                  {FRAMEWORKS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div>
                <label htmlFor="language" className={labelClasses}>
                  Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={selectClasses}
                  aria-label="Language"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Styling */}
              <div>
                <label htmlFor="styling" className={labelClasses}>
                  Styling
                </label>
                <select
                  id="styling"
                  value={styling}
                  onChange={(e) => setStyling(e.target.value)}
                  className={selectClasses}
                  aria-label="Styling approach"
                >
                  {STYLING_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Database */}
              <div>
                <label htmlFor="database" className={labelClasses}>
                  Database
                </label>
                <select
                  id="database"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className={selectClasses}
                  aria-label="Database"
                >
                  {DATABASES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hosting */}
              <div>
                <label htmlFor="hosting" className={labelClasses}>
                  Hosting
                </label>
                <select
                  id="hosting"
                  value={hosting}
                  onChange={(e) => setHosting(e.target.value)}
                  className={selectClasses}
                  aria-label="Hosting provider"
                >
                  {HOSTING_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Testing */}
              <div>
                <label htmlFor="testing" className={labelClasses}>
                  Testing
                </label>
                <select
                  id="testing"
                  value={testing}
                  onChange={(e) => setTesting(e.target.value)}
                  className={selectClasses}
                  aria-label="Testing framework"
                >
                  {TESTING_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* TypeScript Strict */}
              <div className="flex items-center gap-3">
                <input
                  id="strictMode"
                  type="checkbox"
                  checked={strictMode}
                  onChange={(e) => setStrictMode(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-bg-tertiary text-accent-primary focus:ring-accent-primary/50"
                  aria-label="Enable TypeScript strict mode"
                />
                <label
                  htmlFor="strictMode"
                  className="text-sm text-text-secondary"
                >
                  TypeScript Strict Mode
                </label>
              </div>

              {/* Additional Rules */}
              <div>
                <label htmlFor="additionalRules" className={labelClasses}>
                  Additional Rules
                </label>
                <textarea
                  id="additionalRules"
                  rows={4}
                  placeholder="Add any custom rules or conventions for your project..."
                  value={additionalRules}
                  onChange={(e) => setAdditionalRules(e.target.value)}
                  className={`${selectClasses} resize-y`}
                  aria-label="Additional rules"
                />
              </div>
            </div>

          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                Generated CLAUDE.md
              </h2>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-secondary text-white text-sm font-medium rounded-lg transition-colors"
                aria-label="Copy generated CLAUDE.md to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
            <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-text-muted" />
                <span className="text-xs text-text-muted font-mono">
                  CLAUDE.md
                </span>
              </div>
              <pre className="p-5 overflow-x-auto text-sm text-text-primary font-mono leading-relaxed whitespace-pre-wrap">
                {generated}
              </pre>
            </div>

            <p className="text-xs text-text-muted">
              Save this file as <code className="text-accent-cyan font-mono">CLAUDE.md</code> in
              the root of your project. Claude Code will read it automatically
              when you start a conversation in that directory.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
