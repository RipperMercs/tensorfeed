const fs = require("fs");
const SRC = "C:/Users/rippe/AppData/Local/Temp/claude/C--projects-tensorfeed/e2473099-2e7a-4f4a-afae-a56539e20dc3/scratchpad/vantage-quarantine/frontend-portable/index.html";
const OUT = "C:/projects/tensorfeed/public/signal/vantage.js";

const s = fs.readFileSync(SRC, "utf8");

// literal global replace helper (no regex, no escaping surprises)
const rall = (str, a, b) => str.split(a).join(b);

// extract the three parts
let css = s.slice(s.indexOf("<style>") + 7, s.indexOf("</style>"));
let markup = s.slice(s.indexOf("<body>") + 6, s.indexOf('<div class="tip" id="tip">')).trim();
let script = s.slice(s.indexOf("<script>") + 8, s.lastIndexOf("</script>"));

// ============================ RE-THEME CSS TO TENSORFEED ============================
// Keep every CSS custom-property NAME identical (the render logic reads them via
// getComputedStyle), only swap the VALUES to TensorFeed's design tokens. Fonts get
// Inter and JetBrains Mono promoted to the front of the stacks.
function retheme(c){
  // fonts
  c = rall(c,
    '--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
    '--font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;');
  c = rall(c,
    '--font-mono: ui-monospace, "JetBrains Mono", "SFMono-Regular", "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;',
    '--font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;');
  // identity comment
  c = rall(c, "cool-biased neutrals, dark-first VR.org identity", "dark-first TensorFeed Signal identity");

  // light series-cyan first, before the global accent swap below reaches its shared hex
  c = rall(c, "--series-cyan: #0891b2;", "--series-cyan: #0e7490;");
  c = rall(c, "--series-cyan:#0891b2;", "--series-cyan:#0e7490;");

  // dark tokens
  c = rall(c, "#0a0e13", "#0a0a0f"); // plane -> bg-primary
  c = rall(c, "#111820", "#12121a"); // surface -> bg-secondary
  c = rall(c, "#161f2a", "#1a1a2e"); // surface-2 -> bg-tertiary
  c = rall(c, "#eaf1f5", "#e2e8f0"); // ink -> text-primary
  c = rall(c, "#93a1ad", "#94a3b8"); // ink-2 -> text-secondary
  c = rall(c, "#5f6b76", "#64748b"); // muted -> text-muted
  c = rall(c, "rgba(255,255,255,0.09)", "#1e293b"); // border
  c = rall(c, "#1b2530", "#1e293b"); // grid
  c = rall(c, "#2b3946", "#334155"); // axis -> border-strong
  c = rall(c, "#22d3ee", "#6366f1"); // accent + overview tab -> accent-primary
  c = rall(c, "rgba(34,211,238,0.14)", "rgba(99,102,241,0.14)"); // accent-soft
  c = rall(c, "#34c6dd", "#6366f1"); // accent-line -> accent-primary
  c = rall(c, "#1fa3bc", "#06b6d4"); // series-cyan (dark) -> accent-cyan
  c = rall(c, "#9085e9", "#8b5cf6"); // series-violet (dark) -> accent-secondary
  c = rall(c, "#0ca30c", "#10b981"); // good -> accent-green
  c = rall(c, "#fab219", "#f59e0b"); // warn -> accent-amber
  c = rall(c, "#ec835a", "#ef4444"); // serious -> accent-red
  c = rall(c, "#d03b3b", "#ef4444"); // crit -> accent-red
  // shared translucent brand tints used by pills and the live dot
  c = rall(c, "rgba(12,163,12,0.18)", "rgba(16,185,129,0.18)");
  c = rall(c, "rgba(12,163,12,0.13)", "rgba(16,185,129,0.13)");
  c = rall(c, "rgba(236,131,90,0.13)", "rgba(239,68,68,0.13)");

  // light tokens
  c = rall(c, "#eef2f6", "#fafaf9"); // plane
  c = rall(c, "#ffffff", "#f5f5f4"); // surface
  c = rall(c, "#f5f8fb", "#e7e5e4"); // surface-2
  c = rall(c, "#0c141b", "#1c1917"); // ink
  c = rall(c, "#4a5761", "#44403c"); // ink-2
  c = rall(c, "#7a8791", "#78716c"); // muted
  c = rall(c, "rgba(11,20,28,0.11)", "#d6d3d1"); // border
  c = rall(c, "#e6ebf1", "#e7e5e4"); // grid
  c = rall(c, "#c9d3dc", "#a8a29e"); // axis
  c = rall(c, "rgba(8,145,178,0.12)", "rgba(79,70,229,0.10)"); // accent-soft
  c = rall(c, "#0891b2", "#4f46e5"); // accent + accent-line + overview tab -> accent-primary (light)
  c = rall(c, "#4a3aa7", "#7c3aed"); // series-violet -> accent-secondary (light)

  // color-coded tabs (overview handled above; ai tab already uses TF #a78bfa / #7c3aed)
  c = rall(c, "#22c55e", "#10b981"); // regular tab (dark) -> accent-green
  c = rall(c, "#15803d", "#059669"); // regular tab (light) -> accent-green

  // drop the decorative hyphen-run separators inside CSS comments so no prose
  // double hyphen survives (CSS var names keep their leading two-hyphen syntax).
  c = c.replace(/-{4,}/g, "");
  return c;
}
css = retheme(css);

// ============================ TRANSFORM THE SCRIPT ============================
// live data instead of baked constants
// 1) replace the baked DATA SNAPSHOT block with empty holders
script = script.replace(
  /\/\* =+ DATA SNAPSHOT =+ \*\/[\s\S]*?(\/\* =+ HELPERS =+ \*\/)/,
  "let STATS=null, AI=null, TREND=null;\n\n$1"
);
// 2) remove the module-level SEARCH_TOTAL (AI is null at load); recompute inside renderStatic
script = script.replace("const SEARCH_TOTAL = AI.search.reduce((s,x)=>s+x[1],0);", "");
// 3) guard the renderers until data is loaded
script = script.replace("function renderStatic(){", "function renderStatic(){ if(!STATS||!AI||!TREND) return;\n  const SEARCH_TOTAL = AI.search.reduce((s,x)=>s+x[1],0);");
script = script.replace("function renderCharts(){", "function renderCharts(){ if(!STATS||!AI||!TREND) return;");
// 4) robust ChatGPT read:click math (do not assume bySource[0] is chatgpt / avoid /0)
script = script.replace(
  "const ratio = (AI.chatgpt.hits/AI.referrals.bySource[0][1]);",
  "const ratio = (AI.referrals.chatgptClicks ? AI.chatgpt.hits/AI.referrals.chatgptClicks : AI.chatgpt.hits);"
);
script = script.replace(
  "const gap = AI.chatgpt.hits/AI.referrals.bySource[0][1];",
  "const gap = AI.referrals.chatgptClicks ? AI.chatgpt.hits/AI.referrals.chatgptClicks : AI.chatgpt.hits;"
);
script = script.replace(
  '$("#aiClicks").textContent = fmt(AI.referrals.bySource[0][1]);',
  '$("#aiClicks").textContent = fmt(AI.referrals.chatgptClicks);'
);
script = script.replace(
  "max:AI.referrals.bySource[0][1]}",
  "max:(AI.referrals.bySource[0]&&AI.referrals.bySource[0][1])||1}"
);
// 5) drop the eager bottom-of-file render calls (we render after fetch)
script = script.replace(/renderStatic\(\);\s*renderCharts\(\);\s*$/, "");
// 6) XSS hardening: escape log-derived labels (referrer hosts, request paths) before innerHTML.
//    esc() is declared in the appended block and hoists into this IIFE scope.
script = script.replace(
  'const lab = it.mono ? `<code>${it.label}</code>` : it.label;',
  'const lab = it.mono ? ("<code>"+esc(it.label)+"</code>") : esc(it.label);'
);
// 6b) escape the bar tag as well (same log-derived source as it.label)
script = script.replace(
  'const tag = it.tag ? `<span class="tag">${it.tag}</span>` : "";',
  () => 'const tag = it.tag ? `<span class="tag">${esc(it.tag)}</span>` : "";'
);
// 6c) escape the trend tooltip date before it is injected via innerHTML
script = script.replace(
  '<div class="tt">${TREND[i][0]}</div>',
  () => '<div class="tt">${esc(TREND[i][0])}</div>'
);
// 7) scrub the source-project theme key and infra-specific fallback copy
script = rall(script, "vantage-theme", "signal-theme");
script = script.replace("needs rt= in nginx log", "response-time field not available");
script = script.replace("needs proxy_cache + cache= field", "cache-status field not available");

// ============================ TRANSFORM THE MARKUP ============================
// internal-console label (replaces the source project's sign-out control), live banner, live footer
markup = markup.replace(
  '<button class="tbtn" id="themeBtn" type="button">Theme</button>',
  '<button class="tbtn" id="themeBtn" type="button">Theme</button>\n      <span class="tbtn" style="cursor:default;">Internal console</span>'
);
markup = markup.replace(
  /<div class="snap">[\s\S]*?<\/div>/,
  '<div class="snap"><span>🟢 <b>Live</b> · reading <span class="k">/api/signal/stats</span> + <span class="k">/api/signal/ai-stats</span>.</span><span>Internal console, 60s server cache. Data as of <span class="k" id="snapDate">…</span>, refresh for the latest.</span></div>'
);
markup = markup.replace(
  /<footer>[\s\S]*?<\/footer>/,
  '<footer><div><b>Signal</b> · internal live console. Endpoints: <b>/api/signal/stats</b> (regular traffic) and <b>/api/signal/ai-stats</b> (AI bots + referrals, <b>?trend=N</b>). 60-second server cache; refresh to update.</div></footer>'
);
// wordmark + remaining source-project traces in the body copy
markup = markup.replace('VAN<b>TAGE</b>', 'SIG<b>NAL</b>');
markup = markup.replace('<span class="dot"></span> vr.org', '<span class="dot"></span> tensorfeed.ai');
markup = markup.replace('ChatGPT reads vr.org roughly', 'ChatGPT reads tensorfeed.ai roughly');
markup = markup.replace(
  '<b style="color:var(--ink-2)">Waiting on nginx GeoIP.</b> Access logs carry no country yet. One <code>cc=</code> field in the nginx log format lights this up; the snippet is with Mark.',
  '<b style="color:var(--ink-2)">Waiting on geo data.</b> The upstream feed carries no country field yet. This panel lights up automatically once it does.'
);
markup = markup.replace(
  '<b style="color:var(--ink-2)">Waiting on nginx.</b> <code>rt=$request_time</code> (response time, a one-line log change) and <code>cache=$upstream_cache_status</code> (needs proxy_cache) fill these in automatically once added. The snippet is with Mark.',
  '<b style="color:var(--ink-2)">Waiting on performance data.</b> Response time and cache status fill in automatically once the upstream feed provides them.'
);

// escape CSS/MARKUP for embedding in a template literal
const esc = (str) => str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const adapterAndInit = `
/* ============================ LIVE DATA ADAPTER ============================ */
function esc(x){ x=String(x==null?"":x); var m={38:"&amp;",60:"&lt;",62:"&gt;",34:"&quot;",39:"&#39;"}; return x.replace(/[&<>"']/g,function(c){return m[c.charCodeAt(0)];}); }
function classifyHost(h){
  if(!h || h==="(direct)") return "direct";
  if(h.indexOf("tensorfeed.ai")>=0) return "internal";
  if(/google|bing|duckduckgo|brave|baidu|ecosia|kagi|yandex/.test(h)) return "search";
  return "other";
}
const VLABEL={chatgpt:"ChatGPT",gemini:"Gemini",claude:"Claude",perplexity:"Perplexity",copilot:"Copilot"};
function adapt(stats, ai){
  STATS={ fetchedAt:stats.fetchedAt, requests1h:stats.requests1h, requests24h:stats.requests24h,
    uniqueVisitors24h:stats.uniqueVisitors24h, bandwidth24h:stats.bandwidth24h, requests24hPrev:stats.requests24hPrev,
    status:{s2:stats.status2xx,s3:stats.status3xx,s4:stats.status4xx,s5:stats.status5xx}, hourly:stats.hourly||[] };
  const bySource=Object.entries(ai.referrals&&ai.referrals.bySource||{}).map(([k,v])=>[VLABEL[k]||k,v]).sort((a,b)=>b[1]-a[1]);
  AI={ fetchedAt:ai.fetchedAt, botsTotalHits:ai.botsTotalHits||0,
    vendors:Object.entries(ai.vendorTotals||{}).sort((a,b)=>b[1]-a[1]),
    bots:(ai.bots||[]).map(b=>[b.label,b.hits,b.vendor]),
    chatgpt:{ hits:ai.chatgptUser.hits, uniqueIps:ai.chatgptUser.uniqueIps, distinctPages:ai.chatgptUser.distinctPages,
      status2xx:ai.chatgptUser.status2xx, statusOther:ai.chatgptUser.statusOther,
      topPages:(ai.chatgptUser.topPages||[]).map(p=>[p.path,p.hits]), hourlyUtc:ai.chatgptUser.hourlyUtc||[] },
    referrals:{ total:ai.referrals.total, chatgptUniqueVisitors:ai.referrals.chatgptUniqueVisitors,
      chatgptClicks:(ai.referrals.bySource&&ai.referrals.bySource.chatgpt)||0, bySource:bySource },
    topReferrers:(ai.topReferrers||[]).map(r=>[r.host,r.pageviews,classifyHost(r.host)]),
    search:Object.entries(ai.searchReference||{}).sort((a,b)=>b[1]-a[1]),
    modes:{ live:{ hits:(ai.aiModes&&ai.aiModes.live.hits)||0, ips:(ai.aiModes&&ai.aiModes.live.uniqueIps)||0 },
            crawl:{ hits:(ai.aiModes&&ai.aiModes.crawl.hits)||0, ips:(ai.aiModes&&ai.aiModes.crawl.uniqueIps)||0 } },
    humanTopPages:(ai.humanTopPages||[]).map(p=>[p.path,p.hits]),
    notFound:(ai.notFound||[]).map(p=>[p.path,p.hits]),
    geo:{ available:!!(ai.geo&&ai.geo.available), top:((ai.geo&&ai.geo.topCountries)||[]).map(c=>[c.code,c.visitors]) },
    latency:(ai.latency||{available:false, avgMs:0, p50Ms:0, p95Ms:0, samples:0}),
    cache:(ai.cache||{available:false, hitRatio:0, hits:0, total:0, byStatus:{}}) };
  TREND=(ai.trend||[]).slice().reverse().map(d=>[d.date.slice(5).replace("-","/"), d.aiTotal, d.chatgptUser]);
}
async function loadSignalData(){
  const [stats, ai] = await Promise.all([
    fetch("/api/signal/stats",{cache:"no-store"}).then(r=>{ if(!r.ok) throw new Error("stats "+r.status); return r.json(); }),
    fetch("/api/signal/ai-stats?trend=7",{cache:"no-store"}).then(r=>{ if(!r.ok) throw new Error("ai-stats "+r.status); return r.json(); })
  ]);
  adapt(stats, ai);
  renderStatic();
  renderCharts();
}
async function initSignal(){
  const u=document.getElementById("updated"); if(u) u.textContent="loading live data…";
  // The stats endpoints can briefly be unavailable right after a deploy, so
  // retry with backoff (up to ~24s) before surfacing an error, so a deploy
  // blip is invisible instead of a scary banner on refresh.
  const delays=[0,4000,8000,12000];
  for(let i=0;i<delays.length;i++){
    if(delays[i]){ if(u) u.textContent="reconnecting… (endpoints warming up)"; await new Promise(r=>setTimeout(r,delays[i])); }
    try{ await loadSignalData(); return; }
    catch(err){
      if(i===delays.length-1){
        if(u) u.textContent="data unavailable";
        const wrap=document.querySelector(".wrap");
        if(wrap && !document.getElementById("signalErr")){
          const e=document.createElement("div"); e.id="signalErr"; e.className="snap"; e.style.borderColor="var(--crit)";
          e.innerHTML='<span>⚠ <b>Could not load live data.</b> '+esc(String(err&&err.message||err))+'. The stats endpoints may be warming up after a deploy; refresh in a moment.</span>';
          const nav=wrap.querySelector(".tabs"); wrap.insertBefore(e, nav||wrap.firstChild);
        }
      }
    }
  }
}
initSignal();
`;

const out =
`/* Signal live console for /signal. Reads /api/signal/stats + /api/signal/ai-stats (already public).
   Generated from the validated dashboard design; no secrets, safe to serve publicly. */
(function(){
"use strict";
const CSS = \`${esc(css)}\`;
const MARKUP = \`${esc(markup)}\`;
const st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);
document.body.insertAdjacentHTML("afterbegin", MARKUP);
document.title = "TensorFeed Signal";
const tipEl=document.createElement("div"); tipEl.id="tip"; tipEl.className="tip"; document.body.appendChild(tipEl);
${script}
${adapterAndInit}
})();
`;

fs.writeFileSync(OUT, out);
console.log("wrote", OUT, out.length, "bytes");
