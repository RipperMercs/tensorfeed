# TensorFeed.ai Homepage Facelift Spec (for Claude Design)

You are redesigning the homepage of **TensorFeed.ai**, a real-time AI news and data hub. Goal: make the page feel **alive, kinetic, and intelligent**, like watching a trading terminal for the AI industry. Keep it dark, technical, and confident. No marketing fluff, no rounded happy-corp vibes.

Live site: https://tensorfeed.ai
Tech: Next.js 14 App Router + Tailwind CSS, static export, deployed on Cloudflare Pages. Components are React functional with hooks. TypeScript strict.

Output: a single homepage file (`src/app/page.tsx`) plus any new components under `src/components/home/`. Stick to Tailwind and inline styles. No new CSS frameworks, no styled-components, no Framer Motion required (CSS animations preferred for static-export performance, but Framer Motion is fine if it pays for itself).

---

## 1. What TensorFeed Is (so you frame the design correctly)

TensorFeed is the dashboard for everything happening in AI, designed to be readable by **both humans and AI agents**. It pulls together:

- **News aggregation** from 15+ sources (Anthropic, OpenAI, Google, Meta, HuggingFace, TechCrunch, The Verge, Ars Technica, VentureBeat, NVIDIA, ZDNet, Hacker News, arXiv). Refreshes every 10 minutes.
- **Live service status** for every major AI API (Claude, ChatGPT, Gemini, Bedrock, Mistral, Cohere, Perplexity, Replicate, Midjourney, HuggingFace). Polls every 2 to 5 minutes.
- **Model catalog** with pricing, context windows, benchmark scores, release dates across all providers.
- **Agent activity tracking** (which AI agents crawl the site and how often).
- **Original editorial** articles published multiple times per week.
- **Open APIs, RSS, JSON Feed, llms.txt** for agent consumption. No CAPTCHA, no bot blocking. Agents are first-class users.

The brand voice is technical, opinionated, and confident. Think Bloomberg Terminal meets Hacker News meets a research dashboard, not "AI for everyone" SaaS.

---

## 2. Hard Design Constraints

### Color tokens (already defined as CSS variables, do not invent new ones)

```
--bg-primary:       #0a0a0f   /* page background, near-black */
--bg-secondary:     #12121a   /* card surface */
--bg-tertiary:      #1a1a2e   /* hover/active surface */
--text-primary:     #e2e8f0
--text-secondary:   slightly dimmer
--text-muted:       low-contrast labels
--accent-primary:   #6366f1   /* indigo, primary CTA */
--accent-secondary: #8b5cf6   /* violet, secondary */
--accent-cyan:      #06b6d4   /* electric cyan, used for highlights */
--accent-green:     #10b981   /* status OK, live indicators */
--accent-red:       #ef4444   /* status down, alerts */
--accent-amber:     #f59e0b   /* status degraded, warnings */
--border:           subtle dark border
```

Tailwind classes for these are already wired (`bg-bg-primary`, `text-accent-primary`, `border-border`, etc.). Use them. Light mode is supported via ThemeProvider but design dark-first.

### Typography (already loaded as Next fonts)

- **JetBrains Mono**: numbers, code, pricing, status badges, timestamps, ticker text, anything data-flavored
- **Inter**: headings and body prose

Use mono aggressively for data. Mix mono and Inter inside the same card to reinforce the "data terminal" feel.

### Source color coding (already in use, keep consistent on article cards)

- Anthropic: coral/orange
- OpenAI: green
- Google: blue
- Hacker News: orange
- The Verge: purple
- TechCrunch: green
- HuggingFace: yellow
- NVIDIA: lime

### Performance budget

- Static export, hosted on Cloudflare Pages. No SSR.
- LCP under 2.0s on a mid-tier mobile.
- Animations must be GPU-friendly (transform/opacity, no layout-thrashing JS loops).
- Respect `prefers-reduced-motion` and disable all motion when set.
- Mobile-first. Test 375px, 768px, 1280px, 1920px.

### Writing rules (CRITICAL)

- **No em dashes anywhere**. Not in copy, not in alt text, not in code comments. None.
- **No double hyphens (`--`) used as a substitute for em dashes**.
- Use commas, periods, colons, semicolons, or parentheses instead. Rewrite sentences if needed.
- Anti-AI-detection measure. Every word must read as naturally human-written.
- Use `&apos;` for apostrophes inside JSX strings.

### Accessibility

- Semantic HTML: `<main>`, `<section>`, `<article>`, `<nav>`, `<aside>`.
- ARIA labels on every interactive element.
- Keyboard focus states must be visible (do not strip default outlines without replacing them).
- Color contrast WCAG AA minimum.
- All animations behind `prefers-reduced-motion`.

---

## 3. Current Homepage Sections (what's there now)

In top-to-bottom order. Keep this structure unless the redesign clearly improves it.

1. **Hero**: "The AI Pulse" gradient headline + neural network animated background + 3 stat pills (15+ Sources, 10+ API Monitors, Updated Every 10 Min) + animated gradient shimmer divider.
2. **Quick status bar**: horizontally scrollable strip showing Claude / ChatGPT / Gemini / Bedrock / Mistral status dots, with link to /status.
3. **Editorial intro**: 2 short paragraphs explaining what TensorFeed is.
4. **Featured originals (3-up)**: latest 3 editorial articles as cards with violet accent border.
5. **Main feed + sidebar**: HomeFeed (article cards) on the left, Sidebar widget column on the right.
6. **Explore TensorFeed**: 6-card grid linking to Models, Agents, Research, Status, Live Data, Pricing.
7. **Latest from TensorFeed (2-up)**: redundant with section 4, currently just a different layout. Consider removing or repurposing.
8. **FAQ**: 6 Q&A cards in a 2-column grid (also emits FAQPage JSON-LD, do not break that).
9. **Footer strip**: "Aggregating from 15+ sources..." line.

---

## 4. What "More Alive" Means

The page should look and feel like data is **moving through it in real time**. Not gimmicky. Earned motion. Each animated element should reflect actual data or a real signal.

Core moves to land:

### A. A real ticker, not just a static status bar

Replace the quick status strip with a **live ticker** at the very top of the page (above the hero, full-bleed). Scroll horizontally, infinite loop. Items rotate through:

- Service status: `● Claude OK 142ms`, `● ChatGPT OK 89ms`, `● Gemini DEGRADED`
- Model price snapshots: `Opus 4.7 $15/$75 per Mtok`, `GPT-4o $5/$15`
- Latest article timestamps: `Anthropic blog 2m ago`
- Benchmark high scores: `MMLU-Pro leader: Opus 4.7 88.4`

JetBrains Mono. Pause on hover. Each item should feel like a Bloomberg ticker tape entry. Separator between items: a thin vertical bar in `--border` color.

### B. Hero that breathes

Keep "The AI Pulse" gradient headline. Upgrade the neural network background so:

- Nodes pulse subtly when an actual data event would fire (you can fake the cadence: every 1 to 3 seconds randomized).
- A few nodes light up cyan when "active", with a brief glow-decay.
- Lines between active nodes flash briefly to suggest data flow.
- Add a faint scanline or grid texture at very low opacity to reinforce "console" vibe.
- Heading entrance: subtle character-by-character reveal on first paint, then static. Do NOT loop the entrance.
- Gradient shimmer divider stays.

Add a **live "events per minute" counter** somewhere in the hero. Pull from a fake-but-believable number derived from time of day (e.g., 30 to 120 events/min depending on hour). This sells the "alive" idea without needing a real backend feed.

### C. Status bar becomes a real-time grid

Move the existing 5-dot status strip into a more substantial section just below the hero: a **status grid** with up to 10 services, each as a small card showing:

- Service name (Inter)
- Latency in ms (JetBrains Mono, large)
- Status pill (OK / DEGRADED / DOWN with corresponding green/amber/red dot)
- Mini sparkline of last hour (use SVG, faked is fine for the design pass)
- Last checked timestamp ("2m ago")

Cards should pulse-glow at the border when a status changes. Hovering reveals a "View incident history" link.

### D. Article feed gets density and motion

Article cards in the main feed should:

- Use the source color as a **left border accent** (already convention, keep it).
- Show a small monospace timestamp ("4m ago") that updates live without re-rendering the whole card.
- New articles entering the feed should slide in from the top with a brief highlight pulse, then settle.
- Hover state: subtle lift + accent-cyan border glow + chevron arrow appears on the right.
- Add a "filter chip row" above the feed: All / Anthropic / OpenAI / Google / Research / Hacker News. Clicking a chip filters in place with a fast fade transition.

### E. Originals section gets editorial weight

Promote the featured originals from a 3-card row to a more magazine-like layout:

- Lead article: large card, 2-column wide, with a generated abstract/excerpt visible (~200 chars).
- Two supporting articles: stacked on the right.
- Each card has author byline + read time + publish date in mono.
- Hover state: gradient underline animates left-to-right under the title.
- Remove the redundant "Latest from TensorFeed" section lower on the page (or repurpose it for something else, like "Recently Updated Models" or "Latest Incidents").

### F. Explore grid gets personality

The 6-card "Explore TensorFeed" grid is currently flat. Upgrade each card with:

- A small animated micro-illustration on hover (e.g., Models card shows a tiny pulsing chip diagram, Agents card shows a node graph, Live Data card shows a sparkline).
- Background gradient that shifts subtly on hover.
- Arrow chevron animates in from the left on hover.
- Keep the 6 cards: Models Hub, Agent Directory, Research Papers, Status Dashboard, Live Data, API Pricing.

### G. New "Right Now on TensorFeed" section

Add a new section between the feed and the Explore grid: a **live activity stream** showing actual signals from the past hour. 5 to 8 rows of:

- `● 14:32 UTC` &nbsp; New article from Anthropic Blog
- `● 14:30 UTC` &nbsp; Gemini API latency spike detected
- `● 14:28 UTC` &nbsp; Mistral published Mistral Medium 3
- `● 14:25 UTC` &nbsp; ClaudeBot crawled /llms-full.txt

Mono font, very narrow vertical rhythm, almost like a `tail -f` log. Each row fades in from the top. Each event type gets a small color-coded dot prefix.

### H. Agent-aware footer strip

Replace the bland "Aggregating from 15+ sources" footer line with a dual-purpose strip:

- Left: tiny logos of all 15 sources (subtle, monochrome by default, full-color on hover).
- Right: "Built for agents. JSON, RSS, llms.txt, MCP." with small pill badges linking to /developers, /llms.txt, /feed.json.

This reinforces the "first-class agent support" brand position right where the eye lands at the end of the page.

---

## 5. Things NOT to do

- Do not add hero illustrations of robots, brains, or smiling people.
- Do not make it look like a SaaS marketing page (no "Trusted by 1000+ teams" social proof bars, no testimonials, no "Get Started Free" buttons).
- Do not add carousels that auto-rotate (annoying, accessibility hostile).
- Do not introduce new color tokens. Use the palette above.
- Do not use heavy 3D, parallax scroll hijacking, or anything that breaks browser back/forward.
- Do not block content on JS. Page must render fully before hydration.
- Do not add a chatbot widget or "Ask AI" floating button. (We have a /ask page, that's enough.)
- Do not bury the news feed below the fold on desktop. It is the core product.

---

## 6. Deliverables

1. **`src/app/page.tsx`**: full updated homepage. Keep all existing data fetches (`fetchArticles`, `fetchStatuses`) and the `HomeFeed` + `Sidebar` integration. Keep the `FAQPageJsonLd` import and FAQ data exactly as-is so SEO schema does not regress.

2. **New components under `src/components/home/`**:
   - `LiveTicker.tsx`
   - `StatusGrid.tsx`
   - `LiveActivityStream.tsx`
   - `EditorialFeature.tsx` (the new magazine-style originals layout)
   - `ExploreCard.tsx` (the upgraded explore card)
   - `SourceLogosFooter.tsx`

3. **Inline notes** in `page.tsx` (only where absolutely needed) explaining any non-obvious behavior. Default: no comments unless a future reader would be confused.

4. **A short summary at the top of the response** (markdown, not in the code) listing every file you changed or created and what each one does, so I can review before pasting into the repo.

---

## 7. Acceptance Criteria

- [ ] Page renders with zero console errors and zero hydration warnings.
- [ ] Lighthouse Performance score 90+ on mobile.
- [ ] Lighthouse Accessibility score 95+.
- [ ] All animations respect `prefers-reduced-motion`.
- [ ] Zero em dashes, zero double hyphens in any new file.
- [ ] All copy uses correct apostrophe escaping in JSX.
- [ ] No new dependencies unless justified in the response (and even then, prefer none).
- [ ] FAQ JSON-LD still emits correctly (do not remove `FAQPageJsonLd`).
- [ ] Mobile layout works at 375px wide with no horizontal scroll except the live ticker.
- [ ] Light mode (toggle via header) still readable. Dark mode is the design target, light mode just must not break.

---

## 8. Quick Reference: Existing Files You'll Touch

- `src/app/page.tsx`: full rewrite, but preserve data fetches, FAQ schema, Sidebar import.
- `src/components/HomeFeed.tsx`: do NOT rewrite. Keep its current API. Wrap or extend if needed.
- `src/components/layout/Sidebar.tsx`: do NOT rewrite. Keep as-is.
- `src/components/NeuralNetworkBg.tsx`: extend or replace with an upgraded version (e.g. `NeuralNetworkBgV2.tsx` in `src/components/home/`). Keep the original file intact in case rollback is needed.
- `src/components/seo/JsonLd.tsx`: do not modify, just import `FAQPageJsonLd`.

---

## 9. The Vibe in One Sentence

It should feel like opening a Bloomberg terminal for AI: dense, fast, dark, packed with live signal, every pixel earning its place, and clearly built by people who care about both engineers and the agents reading the page.
