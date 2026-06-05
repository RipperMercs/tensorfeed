import * as fs from 'fs';
import { ORIGINALS } from '../src/lib/originals-directory';
import { selectWeeklyTargets, extractChangedSlugs } from '../src/lib/originals-factcheck';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function main(): void {
  const mode = arg('mode') ?? 'weekly';
  const todayMs = Date.now();
  const today = new Date(todayMs).toISOString().slice(0, 10);

  let entries;
  if (mode === 'publish') {
    const changedFile = arg('changed');
    const changed =
      changedFile && fs.existsSync(changedFile)
        ? fs.readFileSync(changedFile, 'utf8').split('\n')
        : [];
    const slugs = new Set(extractChangedSlugs(changed));
    entries = ORIGINALS.filter((e) => slugs.has(e.slug));
  } else {
    entries = selectWeeklyTargets(ORIGINALS, todayMs, 7);
  }

  const targets = entries.map((e) => ({
    slug: e.slug,
    title: e.title,
    date: e.date,
    path: `src/app/originals/${e.slug}/page.tsx`,
  }));

  process.stdout.write(JSON.stringify({ today, mode, targets }, null, 2) + '\n');
}

main();
