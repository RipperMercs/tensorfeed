# TensorFeed.ai: Massive Site-Wide Update Spec

**Date**: April 17, 2026
**Priority**: High (Google AdSense resubmission pending)
**Scope**: New content, data updates, page audits, SEO hardening

Read CLAUDE.md first. Follow every rule in it, especially: NO em dashes, NO double hyphens, `&apos;` for apostrophes in JSX, first-person TensorFeed brand voice, every new page gets sitemap + llms.txt entries.

---

## 1. NEW ARTICLE: Claude Opus 4.7 Release

Claude Opus 4.7 just launched. Write a full original article covering the release.

### 1a. Create the article page

**File**: `src/app/originals/claude-opus-4-7-release/page.tsx`

Follow the exact same structure as `src/app/originals/frontier-model-forum-vs-china/page.tsx` (or any recent article). Every article page needs:

- Metadata export with unique `title` (NO "| TensorFeed.ai" suffix, the root layout template adds it), `description`, `openGraph`, `twitter`
- ArticleJsonLd from `@/components/seo/JsonLd`
- Breadcrumb nav: Originals > Article Title
- Author byline (use "Ripper"), date, read time
- Body content: 800 to 1200 words, multiple `<h2>` sections, at least 3 sections
- Related articles section at the bottom linking to 2 to 3 other originals

**Content angle**: Cover what Opus 4.7 brings (search Anthropic's announcement for specifics), how it compares to 4.6, what changed in pricing/benchmarks/capabilities, what it means for developers and the competitive landscape. Reference TensorFeed's own model page and comparison pages. Write in first-person TensorFeed voice. Vary sentence length. Short paragraphs. Include specific data points and opinions.

**Author**: Ripper
**Date**: Apr 17, 2026
**Read time**: 6 min read

### 1b. Add to originals directory

**File**: `src/lib/originals-directory.ts`

Add a new entry at the TOP of the `ORIGINALS` array:

```typescript
{
  slug: 'claude-opus-4-7-release',
  title: "Claude Opus 4.7 Just Dropped. Here's What Changed.",
  author: 'Ripper',
  date: 'Apr 17, 2026',
  readTime: '6 min read',
  description:
    "Anthropic released Claude Opus 4.7 with [key improvements]. We break down the benchmarks, pricing changes, and what it means for the model race.",
},
```

Update the description with actual details after researching the release.

### 1c. Add to sitemap

**File**: `src/app/sitemap.ts`

Add to the originals section:
```typescript
{ url: `${baseUrl}/originals/claude-opus-4-7-release`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
```

### 1d. Add to llms.txt

**File**: `public/llms.txt`

Add under the Originals section:
```
- [Claude Opus 4.7 Release](https://tensorfeed.ai/originals/claude-opus-4-7-release): Analysis of Anthropic's latest flagship model release
```

---

## 2. UPDATE MODEL DATA FOR CLAUDE OPUS 4.7

### 2a. Update pricing.json

**File**: `data/pricing.json`

Under the `anthropic` provider, add a new model entry for Claude Opus 4.7:

```json
{
  "id": "claude-opus-4-7",
  "name": "Claude Opus 4.7",
  "inputPrice": [RESEARCH ACTUAL PRICE],
  "outputPrice": [RESEARCH ACTUAL PRICE],
  "contextWindow": [RESEARCH ACTUAL CONTEXT],
  "released": "2026-04",
  "capabilities": ["text", "vision", "tool-use", "code"]
}
```

Also update `"lastUpdated"` at the top of the file from `"2026-03-28"` to `"2026-04-17"`.

Research the actual pricing from Anthropic's docs/announcement. If Opus 4.6 pricing changed (e.g. got cheaper now that 4.7 is out), update that too.

### 2b. Update benchmarks.json

**File**: `data/benchmarks.json`

Add a new entry to the `models` array:

```json
{
  "model": "Claude Opus 4.7",
  "provider": "Anthropic",
  "released": "2026-04",
  "scores": {
    "mmlu_pro": [RESEARCH],
    "human_eval": [RESEARCH],
    "gpqa_diamond": [RESEARCH],
    "math": [RESEARCH],
    "swe_bench": [RESEARCH]
  }
}
```

Update `"lastUpdated"` from `"2026-03-29"` to `"2026-04-17"`.

### 2c. Add to model-directory.ts

**File**: `src/lib/model-directory.ts`

Add a new entry at the top of the Anthropic section:

```typescript
{
  slug: 'claude-opus-4-7',
  pricingId: 'claude-opus-4-7',
  benchmarkName: 'Claude Opus 4.7',
  providerId: 'anthropic',
  providerName: 'Anthropic',
  providerUrl: 'https://www.anthropic.com',
  seoTitle: 'Claude Opus 4.7: Pricing, Benchmarks, Specs',
  seoDescription:
    'Claude Opus 4.7 by Anthropic. Latest flagship with [key feature]. Full pricing, benchmark scores, and comparison data. Updated daily on TensorFeed.',
  intro:
    '[Write 2-3 sentences about what makes 4.7 different from 4.6]',
  strengths: ['[Research actual improvements]', '[...]', '[...]', '[...]'],
  useCases: ['Complex analysis and research', 'Large codebase refactoring', 'Multi-step agent workflows', 'Long document processing'],
  docsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
  tier: 'flagship',
},
```

### 2d. Update the Opus 4.6 entry

In the same file, update the Opus 4.6 entry's `intro` to acknowledge it is now the previous-gen flagship:
- Change intro to reference that 4.7 has succeeded it but 4.6 remains available
- Adjust `seoTitle` to say something like "Claude Opus 4.6: Pricing, Benchmarks, Specs (Previous Gen)"

### 2e. Create the model detail page

A new `/models/claude-opus-4-7` page will be auto-generated by `src/app/models/[slug]/page.tsx` using `generateStaticParams()` from the model-directory, so no new page file is needed. Just verify the directory entry is complete.

### 2f. Update provider-directory.ts

**File**: `src/lib/provider-directory.ts`

In the Anthropic entry:
- Add `'Claude Opus 4.7'` to `keyProducts` array (at the front)
- Update the `intro` text to mention Opus 4.7 as the current flagship

### 2g. Add/update comparisons

**File**: `src/lib/comparison-directory.ts`

Update the existing `claude-vs-chatgpt` comparison to pit Opus 4.7 vs GPT-4o instead of Opus 4.6 vs GPT-4o. Update:
- `modelA` to `'claude-opus-4-7'`
- `nameA` to `'Claude Opus 4.7'`
- `benchmarkNameA` to `'Claude Opus 4.7'`
- `seoTitle`, `seoDescription`, `intro`, `verdicts`, `chooseA`, `chooseB` to reflect 4.7

Do the same for `claude-vs-gemini` and `claude-vs-llama`.

For `gpt-4o-vs-claude-sonnet`, leave as-is since it compares GPT-4o vs Sonnet.

### 2h. Update llms.txt

**File**: `public/llms.txt`

Add under Individual Model Pages:
```
- [Claude Opus 4.7](https://tensorfeed.ai/models/claude-opus-4-7): Pricing, benchmarks, specs for Anthropic's latest flagship
```

Update the existing Opus 4.6 line to say "previous-generation flagship".

### 2i. Update sitemap.ts

The sitemap auto-generates model pages from `getAllModelSlugs()`, so no manual change is needed. Same for comparisons and providers. Verify this after all directory changes.

---

## 3. ADDITIONAL NEW ARTICLES (write 2 to 3 more)

The site currently has 18 originals. Write 2 to 3 more to strengthen the content library. Suggested topics (pick the most timely):

### Option A: "GPT-5 and the Race That Never Ends"
Cover where GPT-5 stands (is it out? imminent? what's been announced?) and what it means for the Anthropic/Google/OpenAI race. Reference TensorFeed model data.

### Option B: "MCP Is Eating the Agent Stack"
Follow up on the "MCP Just Hit 97 Million Installs" article. Cover latest MCP adoption numbers, new providers shipping MCP support, what the protocol stack looks like now.

### Option C: "The AI Pricing Floor: How Low Can It Go?"
Cover the continued pricing race. Google's $0.10/1M Flash pricing. Mistral Small at $0.10. What happens when inference approaches zero cost. Reference TensorFeed's pricing page data.

### Option D: "Why Every Developer Needs an llms.txt File"
Cover the llms.txt standard, why agent-readable content matters, how TensorFeed uses it, and a practical guide for other sites. Good for SEO since TensorFeed has a CLAUDE.md guide section already.

For each article:
1. Create `src/app/originals/[slug]/page.tsx` following existing article structure
2. Add to TOP of `ORIGINALS` array in `src/lib/originals-directory.ts`
3. Add to `src/app/sitemap.ts` originals section
4. Add to `public/llms.txt` under Originals

Author rotation: Use "Ripper", "Kira Nolan", or "Marcus Chen". Vary the author. Vary dates slightly (Apr 16, Apr 17).

---

## 4. PAGE-BY-PAGE CONTENT AUDIT

Go through every major page and check for staleness. Here is what to look at:

### 4a. Homepage (`src/app/page.tsx`)
- Verify the "Latest from TensorFeed" section shows the newest 3 articles from `getLatestOriginals(3)`. After adding new articles to the directory, this should auto-update.
- Check hero text is still accurate.

### 4b. Models hub (`src/app/models/page.tsx`)
- Verify Claude Opus 4.7 shows up in the model list
- Check the "Last updated" date reflects April 2026
- Make sure model count in intro text is accurate (will go from 15 to 16+ models)

### 4c. Status pages (`src/app/is-*-down/`)
- These are fine as-is since they pull live data. No content changes needed.

### 4d. Guide pages (check each for accuracy)

| Page | File | Check |
|------|------|-------|
| What is AI? | `src/app/what-is-ai/page.tsx` | Ensure it mentions latest model families (Opus 4.7, etc.) |
| Best AI Tools 2026 | `src/app/best-ai-tools/page.tsx` | Update any tool entries that have changed |
| Best AI Chatbots | `src/app/best-ai-chatbots/page.tsx` | Update Claude entry to mention Opus 4.7 |
| AI API Pricing Guide | `src/app/ai-api-pricing-guide/page.tsx` | Update pricing tables if any have changed |
| What Are AI Agents? | `src/app/what-are-ai-agents/page.tsx` | Check for latest agent frameworks |
| Best Open Source LLMs | `src/app/best-open-source-llms/page.tsx` | Check if new open source models launched |
| AGI & ASI Hub | `src/app/agi-asi/page.tsx` | Check predictions and timeline entries |
| Model Wars | `src/app/model-wars/page.tsx` | Ensure Opus 4.7 shows in the leaderboard data |
| CLAUDE.md Guide | `src/app/claude-md-guide/page.tsx` | Check if Claude Code has any new features |
| CLAUDE.md Examples | `src/app/claude-md-examples/page.tsx` | Still accurate? |
| CLAUDE.md Generator | `src/app/claude-md-generator/page.tsx` | Still functional? |

For each guide page: if you find a reference to "Opus 4.6" as the "latest" or "current flagship", update it to 4.7. If you find pricing data embedded in the page text, verify it matches `pricing.json`.

### 4e. Compare pages (`src/app/compare/`)
- Update any references to Opus 4.6 as flagship, now that 4.7 is out
- The head-to-head data will auto-update from pricing.json and benchmarks.json

### 4f. Provider pages (`src/app/providers/`)
- Anthropic page: verify Opus 4.7 shows in the model table (auto from pricing.json)
- Other providers: check if any have released new models since March 2026

### 4g. Agents directory (`src/app/agents/page.tsx`)
- Check if any major new agent frameworks have launched
- Verify Claude Code, Devin, etc. entries are current

### 4h. Research page (`src/app/research/page.tsx`)
- Content is dynamic from RSS. Check intro text is still accurate.

### 4i. Podcasts page (`src/app/podcasts/page.tsx`)
- Content is dynamic. Check intro text is still accurate.

### 4j. Live data page (`src/app/live/page.tsx`)
- Content is dynamic. Check intro text is still accurate.

### 4k. Today page (`src/app/today/page.tsx`)
- Content is dynamic. Check intro text is still accurate.

### 4l. Benchmarks page (`src/app/benchmarks/page.tsx`)
- Will auto-pull from benchmarks.json. Check the editorial intro text mentions current models.

### 4m. Timeline page (`src/app/timeline/page.tsx`)
- Check `data/timeline.json` and add a new entry for Opus 4.7 release (April 2026).

### 4n. Cost Calculator (`src/app/tools/cost-calculator/page.tsx`)
- Verify it picks up the new model from pricing.json

### 4o. About page (`src/app/about/page.tsx`)
- Check article count is accurate ("16 articles" or whatever the current count is now)
- Update if needed to reflect current count after adding new articles

### 4p. Developers page (`src/app/developers/page.tsx`)
- Verify all API endpoints are documented
- Check code examples are current

### 4q. Changelog (`src/app/changelog/page.tsx`)
- Add a new changelog entry for this update batch

---

## 5. DATA FILE FRESHNESS CHECK

### 5a. `data/pricing.json`
- `lastUpdated` is `"2026-03-28"`. Update to `"2026-04-17"`.
- Research if ANY provider has changed pricing since March 28. Key ones to check:
  - OpenAI: Any new models or price changes?
  - Google: Gemini 2.5 Pro pricing update?
  - Mistral: Any new models?
  - Cohere: Any changes?

### 5b. `data/benchmarks.json`
- `lastUpdated` is `"2026-03-29"`. Update to `"2026-04-17"`.
- Add Claude Opus 4.7 benchmarks (see section 2b)
- Check if any existing benchmark scores have been updated by providers

### 5c. `data/timeline.json`
- Add entry for Claude Opus 4.7 release
- Add any other significant AI milestones from April 2026

### 5d. `data/agents-directory.json`
- Check if any major new agent frameworks or tools have launched

### 5e. `data/sources.json`
- Verify all 12 RSS sources are still active and URLs are correct

---

## 6. SEO HARDENING (for AdSense resubmission)

### 6a. Content depth check
Every page should have at least 300 words of editorial content, not just dynamic widgets. Pages that were previously thin had intros added in the last session. Verify they are still there and haven't been overwritten.

Check these specifically:
- `/benchmarks` page
- `/compare` hub page
- `/timeline` page
- `/incidents` page
- `/live` page
- `/today` page
- `/agents` page
- `/research` page
- `/alerts` page
- `/status` page

### 6b. Internal linking audit
Every guide page should link to at least 3 other TensorFeed pages. Every model page should link to its comparison pages and provider page. Every article should link to related model pages or guide pages.

Run a quick scan: do any pages have zero internal links beyond the nav? If so, add 2 to 3 contextual links in the body text.

### 6c. Meta description uniqueness
Run a check across all pages to ensure no two pages share the same `description` in their metadata export. Each must be unique and between 150 to 160 characters.

### 6d. FAQ schema coverage
Pillar/guide pages should have FAQPageJsonLd. Verify these pages have it:
- `/what-is-ai`
- `/best-ai-tools`
- `/best-ai-chatbots`
- `/ai-api-pricing-guide`
- `/what-are-ai-agents`
- `/best-open-source-llms`

### 6e. Breadcrumb consistency
Every page under a hub (e.g. `/models/[slug]`, `/compare/[slug]`, `/providers/[slug]`, `/originals/[slug]`) should have a breadcrumb nav. Verify this.

---

## 7. ADDITIONAL MODELS TO CONSIDER ADDING

Research whether any of these models have been released or updated since our last data refresh (March 28, 2026) and add them if so:

- **GPT-4.5**: Already in benchmarks.json but NOT in pricing.json or model-directory.ts. If it has public API pricing, add it everywhere.
- **GPT-5**: Has OpenAI released or announced GPT-5? If yes, add it.
- **Gemini 2.5 Flash**: Has Google released a 2.5 Flash model? If yes, add it.
- **Claude Opus 4.7**: (Covered in section 2)
- **Llama 4 Behemoth**: Has Meta released the larger Llama 4 model? If yes, add it.
- **Mistral Medium**: Has Mistral released any new models?
- **DeepSeek**: Should we add DeepSeek models? They are competitive and getting search traffic.
- **xAI Grok**: Should we add Grok models for coverage?

For any new model added:
1. Add to `data/pricing.json`
2. Add to `data/benchmarks.json`
3. Add to `src/lib/model-directory.ts`
4. Add to `public/llms.txt`
5. If new provider: add to `src/lib/provider-directory.ts` and `public/llms.txt`

---

## 8. NEW COMPARISON PAGES TO CONSIDER

High-traffic "vs" queries we are not yet targeting:

- `claude-vs-deepseek` (if DeepSeek added)
- `gpt-4o-vs-gpt-4-5` (OpenAI internal comparison)
- `claude-opus-4-7-vs-claude-opus-4-6` (generational comparison, high intent)
- `gemini-vs-mistral`
- `llama-vs-mistral` (open source showdown)

For each new comparison:
1. Add to `src/lib/comparison-directory.ts`
2. Add to `public/llms.txt`
3. Sitemap auto-generates from `getAllComparisonSlugs()`

---

## 9. WORKER HARDENING (remaining items)

These were identified previously but not yet done:

### 9a. `worker/src/rss.ts`
- Wrap individual feed fetches in try/catch so one failing feed does not crash the entire poll
- Add per-feed error logging

### 9b. `worker/src/status.ts`
- Wrap individual status page checks in try/catch
- Add timeout (5s) per status page fetch so slow pages do not hold up the cron

### 9c. `worker/src/trending.ts`
- Wrap GitHub API calls in try/catch
- Handle rate limiting gracefully (GitHub API has 60 req/hr for unauthenticated)

### 9d. `worker/src/snapshots.ts`
- Verify all KV writes use try/catch
- Verify snapshot restore logic handles corrupt JSON gracefully

---

## 10. VERIFICATION CHECKLIST

After all changes, run these checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Additionally:
- [ ] Zero em dashes in any new or modified file (`grep -r '\xe2\x80\x94' src/` should return nothing)
- [ ] Zero double hyphens used as dashes (`grep -r ' -- ' src/` should return nothing in prose text)
- [ ] All new pages have unique title + description metadata
- [ ] All new pages are in `sitemap.ts`
- [ ] All new pages are in `public/llms.txt`
- [ ] `data/pricing.json` lastUpdated is `"2026-04-17"`
- [ ] `data/benchmarks.json` lastUpdated is `"2026-04-17"`
- [ ] `npm run build` completes with zero errors
- [ ] No hardcoded API keys anywhere

---

## FILE SUMMARY: What Gets Touched

### New files
- `src/app/originals/claude-opus-4-7-release/page.tsx`
- `src/app/originals/[2-3 more article slugs]/page.tsx`

### Modified data files
- `data/pricing.json` (add Opus 4.7, update lastUpdated, check all prices)
- `data/benchmarks.json` (add Opus 4.7, update lastUpdated)
- `data/timeline.json` (add April 2026 entries)
- `data/agents-directory.json` (if new agents found)

### Modified source files
- `src/lib/originals-directory.ts` (add 3 to 4 new articles at top)
- `src/lib/model-directory.ts` (add Opus 4.7, update Opus 4.6 description)
- `src/lib/comparison-directory.ts` (update comparisons to use Opus 4.7)
- `src/lib/provider-directory.ts` (update Anthropic entry)
- `src/app/sitemap.ts` (add new original article URLs)
- `public/llms.txt` (add new model pages, articles, comparisons)

### Pages to audit and potentially update
- `src/app/what-is-ai/page.tsx`
- `src/app/best-ai-tools/page.tsx`
- `src/app/best-ai-chatbots/page.tsx`
- `src/app/ai-api-pricing-guide/page.tsx`
- `src/app/what-are-ai-agents/page.tsx`
- `src/app/best-open-source-llms/page.tsx`
- `src/app/about/page.tsx`
- `src/app/changelog/page.tsx`
- `src/app/models/page.tsx`
- `src/app/agi-asi/page.tsx`
- `src/app/model-wars/page.tsx`
- Any other page referencing "Opus 4.6 as the latest"

### Worker files to harden
- `worker/src/rss.ts`
- `worker/src/status.ts`
- `worker/src/trending.ts`
- `worker/src/snapshots.ts`

---

## PRIORITY ORDER

1. **Data updates first** (pricing.json, benchmarks.json, model-directory, provider-directory, comparison-directory) so all pages render correctly
2. **Claude Opus 4.7 article** (new content, high-value for SEO)
3. **2 to 3 additional articles** (content depth for AdSense)
4. **Page-by-page audit** (update stale references)
5. **SEO hardening** (meta descriptions, internal links, FAQ schema)
6. **New models/comparisons** (if research finds them)
7. **Worker hardening** (important but not blocking AdSense)
8. **Verification checklist** (always last)
