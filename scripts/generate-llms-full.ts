/**
 * generate-llms-full.ts
 *
 * Reads the pillar page TSX files, extracts readable text content from JSX,
 * and writes public/llms-full.txt as clean markdown.
 *
 * Usage: tsx scripts/generate-llms-full.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'llms-full.txt');
const PUBLIC = path.join(ROOT, 'public');

// Pages to extract, in order
const PAGES: { file: string; title: string }[] = [
  {
    file: 'src/app/what-is-ai/page.tsx',
    title: 'What is Artificial Intelligence? A Complete Guide',
  },
  {
    file: 'src/app/best-ai-tools/page.tsx',
    title: 'Best AI Tools in 2026: The Definitive Guide',
  },
  {
    file: 'src/app/best-ai-chatbots/page.tsx',
    title: 'Best AI Chatbots Compared (2026)',
  },
  {
    file: 'src/app/ai-api-pricing-guide/page.tsx',
    title: 'AI API Pricing Guide: Every Provider Compared',
  },
  {
    file: 'src/app/what-are-ai-agents/page.tsx',
    title: 'What Are AI Agents? Everything You Need to Know',
  },
  {
    file: 'src/app/best-open-source-llms/page.tsx',
    title: 'Best Open Source LLMs in 2026',
  },
  {
    file: 'src/app/about/page.tsx',
    title: 'About TensorFeed.ai',
  },
];

/**
 * Extract readable text from a TSX source string.
 * Strips imports, className attributes, JSX tags, and converts to markdown.
 */
function extractText(tsx: string): string {
  let text = tsx;

  // Remove import statements
  text = text.replace(/^import\s.*?;\s*$/gm, '');

  // Remove export const metadata block
  text = text.replace(/export\s+const\s+metadata:\s*Metadata\s*=\s*\{[\s\S]*?\};\s*/g, '');

  // Remove interface/type declarations
  text = text.replace(/^interface\s+\w+\s*\{[\s\S]*?\}\s*$/gm, '');

  // Remove const data arrays/objects (tool lists, chatbot lists, model lists, etc.)
  text = text.replace(
    /^const\s+\w+(?::\s*[^=]+)?\s*=\s*\[[\s\S]*?\];\s*$/gm,
    ''
  );

  // Remove export default function line and its opening brace
  text = text.replace(/export\s+default\s+function\s+\w+\(\)\s*\{\s*return\s*\(/g, '');

  // Remove ArticleJsonLd components
  text = text.replace(/<ArticleJsonLd[\s\S]*?\/>/g, '');

  // Remove JSX comments
  text = text.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  // Remove className attributes
  text = text.replace(/\s*className="[^"]*"/g, '');

  // Convert headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, '# $1');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, '## $1');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, '### $1');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/g, '#### $1');

  // Convert bold/strong
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, '**$1**');

  // Convert code
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/g, '`$1`');

  // Convert list items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, '- $1');

  // Convert paragraphs
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/g, '$1\n');

  // Convert links - keep text, drop JSX
  text = text.replace(/<Link[^>]*>([\s\S]*?)<\/Link>/g, '$1');
  text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/g, '$1');

  // Convert table headers and cells
  text = text.replace(/<th[^>]*>([\s\S]*?)<\/th>/g, '| $1 ');
  text = text.replace(/<td[^>]*>([\s\S]*?)<\/td>/g, '| $1 ');
  text = text.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/g, '$1|\n');
  text = text.replace(/<thead[^>]*>([\s\S]*?)<\/thead>/g, '$1');
  text = text.replace(/<tbody[^>]*>([\s\S]*?)<\/tbody>/g, '$1');

  // Convert dt/dd
  text = text.replace(/<dt[^>]*>([\s\S]*?)<\/dt>/g, '**$1**');
  text = text.replace(/<dd[^>]*>([\s\S]*?)<\/dd>/g, '$1\n');

  // Remove remaining HTML/JSX tags
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, '');

  // Remove JSX expressions like {' '}, {item.title}, etc.
  text = text.replace(/\{'\s*'\}/g, ' ');
  text = text.replace(/\{\w+\.[\w.]+\}/g, '');

  // Remove remaining curly brace expressions
  text = text.replace(/\{[^}]*\}/g, '');

  // Decode HTML entities
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&larr;/g, '<-');
  text = text.replace(/&rarr;/g, '->');

  // Clean up excessive whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/^\s+$/gm, '');

  // Remove trailing JSX closure (closing parens, braces)
  text = text.replace(/\s*\);\s*\}\s*$/g, '');

  return text.trim();
}

function main(): void {
  const today = new Date().toISOString().split('T')[0];

  const header = `# TensorFeed.ai - Full Documentation

> Complete reference content from TensorFeed.ai for full-context AI ingestion.
> Source: https://tensorfeed.ai
> Last generated: ${today}
`;

  const sections: string[] = [header];

  for (const page of PAGES) {
    const filePath = path.join(ROOT, page.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[WARN] File not found: ${filePath}`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const content = extractText(raw);

    sections.push(`---

## ${page.title}

${content}`);
  }

  fs.writeFileSync(OUT, sections.join('\n\n'), 'utf-8');
  console.log(`[OK] Generated ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);

  // Generate individual .md files for each pillar page (excluding about)
  const PILLAR_SLUGS = [
    'what-is-ai',
    'best-ai-tools',
    'best-ai-chatbots',
    'ai-api-pricing-guide',
    'what-are-ai-agents',
    'best-open-source-llms',
  ];

  for (const page of PAGES) {
    // Derive slug from file path: src/app/<slug>/page.tsx
    const slug = page.file.split('/').slice(-2, -1)[0];
    if (!PILLAR_SLUGS.includes(slug)) continue;

    const filePath = path.join(ROOT, page.file);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const content = extractText(raw);

    const mdContent = `# ${page.title}

> Source: https://tensorfeed.ai/${slug}
> Last generated: ${today}

${content}
`;

    const mdPath = path.join(PUBLIC, `${slug}.md`);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');
    console.log(`[OK] Generated ${mdPath} (${(fs.statSync(mdPath).size / 1024).toFixed(1)} KB)`);
  }
}

main();
