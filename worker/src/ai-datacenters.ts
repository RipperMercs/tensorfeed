/**
 * AI Datacenter Buildout registry.
 *
 * Hand-curated catalog of publicly announced AI datacenter projects: the
 * gigawatt-class training and inference campuses being built by the labs
 * and hyperscalers. Each entry summarizes a single project drawn from a
 * public announcement or filing (source_url).
 *
 * Curation rules:
 *   - Power (power_mw) and capex (capex_usd_b) are disclosed values only.
 *     Where a figure was not publicly disclosed, or only a campus-level
 *     ambition exists rather than a clean per-site number, the field is
 *     null and the caveat is recorded in notes.
 *   - Some disclosed figures are stated scaling targets, not commissioned
 *     capacity. The per-entry confidence and notes carry that distinction.
 *   - status reflects the most advanced publicly reported state of the
 *     project as a whole.
 *
 * Update cadence: editorial, on redeploy, as new projects hit the public
 * record. No cron, no live ingest. Sister to ai-funding-registry.ts and
 * ai-policy-registry.ts (same shape: factual underlying data, opinionated
 * curation, structured response).
 */

export type DatacenterStatus = 'announced' | 'under_construction' | 'operational' | 'expansion' | 'paused';
export type DatacenterPurpose = 'training' | 'inference' | 'mixed' | 'unknown';
export type PowerBasis = 'planned' | 'operational' | 'phase';
export type DatacenterConfidence = 'high' | 'medium' | 'low';

export interface DatacenterEntry {
  id: string;
  operator: string;
  project_name: string;
  country: string;
  region: string;
  city: string | null;
  power_mw: number | null;
  power_basis: PowerBasis;
  status: DatacenterStatus;
  purpose: DatacenterPurpose;
  first_power: string | null;
  full_capacity: string | null;
  capex_usd_b: number | null;
  accelerator: string | null;
  partners: string[];
  source_url: string;
  last_checked: string;
  confidence: DatacenterConfidence;
  notes: string;
}

export const AI_DATACENTERS: DatacenterEntry[] = [
  {
    id: 'openai-stargate-abilene',
    operator: 'OpenAI / Oracle',
    project_name: 'Stargate Abilene',
    country: 'US',
    region: 'Texas',
    city: 'Abilene',
    power_mw: 1200,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: '2025-06',
    full_capacity: '2026',
    capex_usd_b: null,
    accelerator: 'GB200 NVL72',
    partners: ['Oracle', 'SoftBank', 'Crusoe', 'Vantage', 'NVIDIA'],
    source_url: 'https://openai.com/index/five-new-stargate-sites/',
    last_checked: '2026-06-04',
    confidence: 'high',
    notes: 'Flagship Stargate site on Lancium Clean Campus, built by Crusoe. 8 buildings to 1.2 GW; first GB200 racks delivered June 2025, partial operation. Planned 600 MW expansion was scrapped in early 2026.',
  },
  {
    id: 'crusoe-abilene-microsoft',
    operator: 'Crusoe',
    project_name: 'Crusoe Abilene AI Factory (Microsoft)',
    country: 'US',
    region: 'Texas',
    city: 'Abilene',
    power_mw: 900,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: '2027',
    full_capacity: null,
    capex_usd_b: null,
    accelerator: null,
    partners: ['Microsoft'],
    source_url: 'https://www.crusoe.ai/resources/newsroom/crusoe-announces-new-900-mw-ai-factory-campus-in-abilene-texas-to-support-microsoft-ai-infrastructure',
    last_checked: '2026-06-04',
    confidence: 'high',
    notes: 'Separate 900 MW campus (two buildings, 336 MW IT load each) adjacent to the Stargate site, leased to Microsoft after OpenAI walked away. Brings total Abilene footprint to about 2.1 GW. First building energized mid 2027.',
  },
  {
    id: 'openai-stargate-shackelford',
    operator: 'OpenAI / Oracle',
    project_name: 'Stargate Shackelford County',
    country: 'US',
    region: 'Texas',
    city: 'Albany',
    power_mw: null,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: '2026',
    full_capacity: '2028',
    capex_usd_b: null,
    accelerator: null,
    partners: ['Oracle', 'Vantage Data Centers'],
    source_url: 'https://openai.com/index/five-new-stargate-sites/',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'Oracle led, developed by Vantage. OpenAI did not disclose a per site MW; adjacent campus widely reported around 1.4 GW with Epoch estimating 2.0 GW, but no official per site figure, so power left null.',
  },
  {
    id: 'openai-stargate-dona-ana',
    operator: 'OpenAI / Oracle',
    project_name: 'Stargate Dona Ana County',
    country: 'US',
    region: 'New Mexico',
    city: null,
    power_mw: null,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: null,
    full_capacity: '2028',
    capex_usd_b: null,
    accelerator: null,
    partners: ['Oracle', 'STACK Infrastructure'],
    source_url: 'https://openai.com/index/five-new-stargate-sites/',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'Oracle led, developed by STACK. No official per site MW disclosed (Epoch estimates about 2.2 GW). Foundation work underway per third party tracking.',
  },
  {
    id: 'openai-stargate-milam',
    operator: 'OpenAI / SoftBank',
    project_name: 'Stargate Milam County (Freebird)',
    country: 'US',
    region: 'Texas',
    city: 'Milano',
    power_mw: null,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: '2026-10',
    full_capacity: '2028',
    capex_usd_b: null,
    accelerator: null,
    partners: ['SoftBank', 'SB Energy'],
    source_url: 'https://openai.com/index/five-new-stargate-sites/',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'SoftBank and SB Energy led fast build site. OpenAI stated Milam plus Lordstown can scale to a combined 1.5 GW over 18 months; no clean standalone official MW, so power left null. First building operational October 2026 per reporting.',
  },
  {
    id: 'openai-stargate-lordstown',
    operator: 'OpenAI / SoftBank',
    project_name: 'Stargate Lordstown',
    country: 'US',
    region: 'Ohio',
    city: 'Lordstown',
    power_mw: null,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: '2026',
    full_capacity: null,
    capex_usd_b: null,
    accelerator: null,
    partners: ['SoftBank', 'Foxconn'],
    source_url: 'https://openai.com/index/five-new-stargate-sites/',
    last_checked: '2026-06-04',
    confidence: 'low',
    notes: 'SoftBank and Foxconn JV; part of the site is a server manufacturing facility, not pure compute. Combined with Milam scales to 1.5 GW per OpenAI; no standalone MW. Lowest confidence Stargate entry.',
  },
  {
    id: 'openai-stargate-michigan-barn',
    operator: 'OpenAI / Oracle',
    project_name: 'Stargate Michigan (The Barn)',
    country: 'US',
    region: 'Michigan',
    city: 'Saline',
    power_mw: 1000,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: null,
    full_capacity: null,
    capex_usd_b: 7,
    accelerator: null,
    partners: ['Oracle', 'Related Digital', 'Walbridge', 'Blackstone'],
    source_url: 'https://openai.com/index/stargate-michigan-data-center/',
    last_checked: '2026-06-04',
    confidence: 'high',
    notes: 'Officially named The Barn; OpenAI broke ground June 1 2026 and discloses 1 GW. The 7 billion dollar figure widely reported. Three 550k sq ft buildings on 250 acres.',
  },
  {
    id: 'openai-stargate-wisconsin-port-washington',
    operator: 'OpenAI / Oracle',
    project_name: 'Stargate Wisconsin (Lighthouse)',
    country: 'US',
    region: 'Wisconsin',
    city: 'Port Washington',
    power_mw: null,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: null,
    full_capacity: '2028',
    capex_usd_b: null,
    accelerator: null,
    partners: ['Oracle', 'Vantage Data Centers'],
    source_url: 'https://openai.com/index/five-new-stargate-sites/',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'The previously unnamed Midwest site, confirmed October 22 2025 as Wisconsin, Oracle and Vantage. No official MW (Epoch estimates about 1.3 GW). Distinct from Microsoft Fairwater, also in Wisconsin.',
  },
  {
    id: 'openai-stargate-uae-abu-dhabi',
    operator: 'OpenAI / Oracle / G42',
    project_name: 'Stargate UAE',
    country: 'AE',
    region: 'Abu Dhabi',
    city: 'Abu Dhabi',
    power_mw: 1000,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: '2026',
    full_capacity: null,
    capex_usd_b: null,
    accelerator: 'GB300 NVL72',
    partners: ['G42', 'Oracle', 'NVIDIA', 'Cisco', 'SoftBank'],
    source_url: 'https://openai.com/index/introducing-stargate-uae/',
    last_checked: '2026-06-04',
    confidence: 'high',
    notes: '1 GW cluster disclosed by OpenAI, first 200 MW expected live 2026. Sits within a larger 5 GW G42 AI campus vision; the 5 GW figure is the campus ambition, not this cluster, so power reflects the disclosed 1 GW.',
  },
  {
    id: 'openai-stargate-norway-narvik',
    operator: 'OpenAI / Nscale / Aker',
    project_name: 'Stargate Norway',
    country: 'NO',
    region: 'Nordland',
    city: 'Narvik',
    power_mw: 230,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'training',
    first_power: null,
    full_capacity: '2026',
    capex_usd_b: 1,
    accelerator: null,
    partners: ['Nscale', 'Aker', 'NVIDIA'],
    source_url: 'https://www.nscale.com/press-releases/stargate-norway-nscale-aker-openai',
    last_checked: '2026-06-04',
    confidence: 'high',
    notes: '230 MW disclosed with a planned 290 MW expansion (about 520 MW total ambition). 100,000 NVIDIA GPUs targeted by end 2026, hydropower. About 1 billion dollars initial capital. Kvandal site near Narvik.',
  },
  {
    id: 'microsoft-fairwater-wisconsin',
    operator: 'Microsoft',
    project_name: 'Fairwater',
    country: 'US',
    region: 'Wisconsin',
    city: 'Mount Pleasant',
    power_mw: null,
    power_basis: 'planned',
    status: 'operational',
    purpose: 'training',
    first_power: '2026-04',
    full_capacity: '2027',
    capex_usd_b: 7.3,
    accelerator: 'GB200 NVL72',
    partners: [],
    source_url: 'https://blogs.microsoft.com/blog/2025/09/18/inside-the-worlds-most-powerful-ai-datacenter/',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'Went live April 2026 with GB200 and GB300. 7.3 billion dollar Wisconsin investment per state filings. Power figures contested: state filing implies about 900 MW full build, third party (Epoch) estimates the multi building campus toward about 3.3 GW by late 2027. No single clean Microsoft disclosed MW, so power left null.',
  },
  {
    id: 'meta-prometheus-new-albany',
    operator: 'Meta',
    project_name: 'Prometheus',
    country: 'US',
    region: 'Ohio',
    city: 'New Albany',
    power_mw: 1000,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'training',
    first_power: '2026',
    full_capacity: null,
    capex_usd_b: null,
    accelerator: null,
    partners: [],
    source_url: 'https://about.fb.com/news/2026/04/infrastructure-explained-meta-data-centers/',
    last_checked: '2026-06-04',
    confidence: 'high',
    notes: 'Meta first titan AI supercluster, New Albany Ohio, coming online 2026. Meta officially states the New Albany facility will have 1 GW or more of capacity. Partly nuclear powered plus on site gas.',
  },
  {
    id: 'meta-hyperion-richland-parish',
    operator: 'Meta',
    project_name: 'Hyperion',
    country: 'US',
    region: 'Louisiana',
    city: 'Richland Parish',
    power_mw: 5000,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'training',
    first_power: '2027',
    full_capacity: '2030',
    capex_usd_b: 27,
    accelerator: null,
    partners: ['Blue Owl Capital', 'Entergy'],
    source_url: 'https://www.datacenterfrontier.com/hyperscale/article/55310441/ownership-and-power-challenges-in-metas-hyperion-and-prometheus-data-centers',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'Zuckerberg disclosed Hyperion will scale to about 5 GW of compute power (interim about 1.5 to 2 GW by 2027). 27 billion dollar JV development cost with Blue Owl reported; Meta total spend reported far higher. 5 GW is the stated scaling target, not yet operational.',
  },
  {
    id: 'meta-el-paso',
    operator: 'Meta',
    project_name: 'Meta El Paso Data Center',
    country: 'US',
    region: 'Texas',
    city: 'El Paso',
    power_mw: 1000,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'training',
    first_power: null,
    full_capacity: '2028',
    capex_usd_b: 10,
    accelerator: null,
    partners: [],
    source_url: 'https://datacenters.atmeta.com/2025/10/hello-el-paso/',
    last_checked: '2026-06-04',
    confidence: 'high',
    notes: 'Meta discloses ability to scale to 1 GW by 2028. Investment raised to 10 billion dollars (from initial 1.5 billion) per March 2026 reporting; Meta own announcement page cited 1.5 billion plus, so capex reflects the later 10 billion figure (note the discrepancy).',
  },
  {
    id: 'xai-colossus-memphis',
    operator: 'xAI',
    project_name: 'Colossus',
    country: 'US',
    region: 'Tennessee',
    city: 'Memphis',
    power_mw: null,
    power_basis: 'operational',
    status: 'operational',
    purpose: 'training',
    first_power: '2024',
    full_capacity: null,
    capex_usd_b: null,
    accelerator: 'NVIDIA H100/H200',
    partners: ['NVIDIA'],
    source_url: 'https://x.ai/colossus',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'Original Colossus 1 in Memphis, operational since 2024 with 100k then 200k plus GPUs. Specific MW not cleanly disclosed by xAI for site 1 alone; on site gas turbines well documented. See Colossus 2 entry for the 2 GW expansion.',
  },
  {
    id: 'xai-colossus-2-memphis',
    operator: 'xAI',
    project_name: 'Colossus 2',
    country: 'US',
    region: 'Tennessee',
    city: 'Memphis',
    power_mw: 2000,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'training',
    first_power: '2026',
    full_capacity: null,
    capex_usd_b: 18,
    accelerator: 'GB200/GB300 NVL72',
    partners: ['NVIDIA'],
    source_url: 'https://newsletter.semianalysis.com/p/xais-colossus-2-first-gigawatt-datacenter',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'Musk announced a third building January 2026 expanding Colossus to 2 GW total; about 555,000 GPUs cited for about 18 billion dollars. The 2 GW, 555k GPU, and 18 billion figures come from Musk statements and SemiAnalysis, not a formal press release, so confidence is medium.',
  },
  {
    id: 'aws-project-rainier-indiana',
    operator: 'Amazon Web Services',
    project_name: 'Project Rainier',
    country: 'US',
    region: 'Indiana',
    city: 'New Carlisle',
    power_mw: 2200,
    power_basis: 'planned',
    status: 'operational',
    purpose: 'training',
    first_power: '2025-10',
    full_capacity: null,
    capex_usd_b: 11,
    accelerator: 'Trainium2',
    partners: ['Anthropic'],
    source_url: 'https://www.cnbc.com/2025/10/29/amazon-opens-11-billion-ai-data-center-project-rainier-in-indiana.html',
    last_checked: '2026-06-04',
    confidence: 'high',
    notes: 'Activated October 2025, dedicated to Anthropic. Full site is 30 buildings drawing more than 2.2 GW. 11 billion dollar Indiana investment. Over 1M Trainium2 chips deployed by early 2026 (power is the disclosed full site target).',
  },
  {
    id: 'anthropic-fluidstack-texas',
    operator: 'Anthropic / Fluidstack',
    project_name: 'Anthropic Fluidstack Texas',
    country: 'US',
    region: 'Texas',
    city: null,
    power_mw: null,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'training',
    first_power: '2026',
    full_capacity: null,
    capex_usd_b: null,
    accelerator: null,
    partners: ['Fluidstack'],
    source_url: 'https://www.anthropic.com/news/anthropic-invests-50-billion-in-american-ai-infrastructure',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'Part of Anthropic 50 billion dollar Fluidstack built program (Texas plus New York). The 50 billion is the program total, not this site; no per site MW disclosed. Sites come online through 2026.',
  },
  {
    id: 'anthropic-fluidstack-new-york',
    operator: 'Anthropic / Fluidstack',
    project_name: 'Anthropic Fluidstack New York',
    country: 'US',
    region: 'New York',
    city: null,
    power_mw: null,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'training',
    first_power: '2026',
    full_capacity: null,
    capex_usd_b: null,
    accelerator: null,
    partners: ['Fluidstack'],
    source_url: 'https://www.anthropic.com/news/anthropic-invests-50-billion-in-american-ai-infrastructure',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'Second initial Fluidstack site under Anthropic 50 billion dollar program. No per site MW or exact city disclosed; comes online through 2026.',
  },
  {
    id: 'google-blackstone-tpu-jv',
    operator: 'Google',
    project_name: 'Google and Blackstone TPU Cloud JV',
    country: 'US',
    region: '',
    city: null,
    power_mw: 500,
    power_basis: 'planned',
    status: 'announced',
    purpose: 'mixed',
    first_power: '2027',
    full_capacity: null,
    capex_usd_b: null,
    accelerator: 'TPU',
    partners: ['Blackstone'],
    source_url: 'https://www.blackstone.com/news/press/blackstone-announces-joint-venture-with-google-to-create-new-tpu-cloud/',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: 'May 2026 JV; Blackstone initial 5 billion dollar equity to bring 500 MW online in 2027. No specific site location yet. capex left null (equity commitment, not project capex).',
  },
  {
    id: 'coreweave-lancaster-pa',
    operator: 'CoreWeave',
    project_name: 'CoreWeave Lancaster',
    country: 'US',
    region: 'Pennsylvania',
    city: 'Lancaster',
    power_mw: 100,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: '2027',
    full_capacity: null,
    capex_usd_b: 6,
    accelerator: null,
    partners: ['Chirisa Technology Parks', 'Machine Investment Group'],
    source_url: 'https://www.businesswire.com/news/home/20250715975958/en/CoreWeave-Announces-Multi-Billion-Dollar-Commitment-to-AI-Infrastructure-in-Pennsylvania',
    last_checked: '2026-06-04',
    confidence: 'high',
    notes: '6 billion dollar plus commitment. Initial 100 MW with potential to expand to 300 MW (power reflects the disclosed initial 100 MW). First phase completion summer 2027.',
  },
  {
    id: 'nebius-vineland-nj',
    operator: 'Nebius',
    project_name: 'Nebius Vineland',
    country: 'US',
    region: 'New Jersey',
    city: 'Vineland',
    power_mw: 300,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: '2025',
    full_capacity: '2026',
    capex_usd_b: null,
    accelerator: null,
    partners: ['Microsoft'],
    source_url: 'https://www.datacenterdynamics.com/en/news/nebius-signs-3bn-deal-with-meta-says-current-available-capacity-is-sold-out-as-it-targets-25gw-by-end-of-2026/',
    last_checked: '2026-06-04',
    confidence: 'medium',
    notes: '300 MW initial with potential 400 MW expansion (about 700 MW). Anchors a 17.4 billion dollar (up to 19.4 billion) Microsoft capacity deal. First 300 MW phasing in from 2025 into 2026. power reflects disclosed initial 300 MW.',
  },
  {
    id: 'reliance-jamnagar-india',
    operator: 'Reliance / Google / Meta',
    project_name: 'Jamnagar AI Data Center',
    country: 'IN',
    region: 'Gujarat',
    city: 'Jamnagar',
    power_mw: 3000,
    power_basis: 'planned',
    status: 'under_construction',
    purpose: 'mixed',
    first_power: '2026',
    full_capacity: null,
    capex_usd_b: null,
    accelerator: null,
    partners: ['Google', 'Meta', 'NVIDIA'],
    source_url: 'https://www.lightreading.com/data-centers/india-s-reliance-is-building-massive-3gw-data-center-report',
    last_checked: '2026-06-04',
    confidence: 'low',
    notes: 'Targeting 3 GW (one of the largest globally if realized). The 3 GW figure and 20 to 30 billion dollar cost come from reporting on the AGM announcement, not a clean primary filing; more than 120 MW expected online H2 2026. Lower confidence on the 3 GW headline figure.',
  },
];

export const AI_DATACENTERS_LAST_UPDATED = '2026-06-04';

export const DATACENTERS_ATTRIBUTION = {
  source: 'TensorFeed editorial AI datacenter registry',
  policy: 'Each entry summarizes a publicly announced AI datacenter project. Power and capex figures are disclosed values only (null where not publicly disclosed) and some are stated scaling targets, not commissioned capacity; see notes per entry. The source_url links to a public announcement or filing.',
};

// ── Pure helpers ────────────────────────────────────────────────────

export interface DatacenterFilter {
  operator?: string;
  status?: string;
  country?: string;
  region?: string;
  purpose?: string;
}

const STATUS_PRIORITY: Record<DatacenterStatus, number> = {
  operational: 0,
  under_construction: 1,
  expansion: 2,
  announced: 3,
  paused: 4,
};

/**
 * Filter the registry by operator (case-insensitive substring) and
 * status / country / region / purpose (case-insensitive exact). Returns a
 * new array sorted by status priority (operational first), then power_mw
 * descending with nulls last. Does not mutate the input.
 */
export function filterDatacenters(entries: DatacenterEntry[], f: DatacenterFilter): DatacenterEntry[] {
  let items = entries.slice();

  if (f.operator) {
    const needle = f.operator.toLowerCase();
    items = items.filter((d) => d.operator.toLowerCase().includes(needle));
  }
  if (f.status) {
    const needle = f.status.toLowerCase();
    items = items.filter((d) => d.status.toLowerCase() === needle);
  }
  if (f.country) {
    const needle = f.country.toLowerCase();
    items = items.filter((d) => d.country.toLowerCase() === needle);
  }
  if (f.region) {
    const needle = f.region.toLowerCase();
    items = items.filter((d) => d.region.toLowerCase() === needle);
  }
  if (f.purpose) {
    const needle = f.purpose.toLowerCase();
    items = items.filter((d) => d.purpose.toLowerCase() === needle);
  }

  items.sort((a, b) => {
    const r = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (r !== 0) return r;
    // power_mw desc, nulls last
    if (a.power_mw === null && b.power_mw === null) return 0;
    if (a.power_mw === null) return 1;
    if (b.power_mw === null) return -1;
    return b.power_mw - a.power_mw;
  });

  return items;
}

export interface BuildoutAggregate {
  generated_from: string;
  totals: {
    projects: number;
    disclosed_power_mw: number;
    disclosed_capex_usd_b: number;
    with_power_disclosed: number;
  };
  by_operator: Array<{ operator: string; projects: number; disclosed_power_mw: number }>;
  by_region: Array<{ country: string; region: string; projects: number; disclosed_power_mw: number }>;
  by_status: Record<DatacenterStatus, number>;
  by_purpose: Record<DatacenterPurpose, number>;
  upcoming: Array<{ id: string; operator: string; project_name: string; first_power: string; power_mw: number | null }>;
  attribution: typeof DATACENTERS_ATTRIBUTION;
}

/**
 * Build the buildout aggregate over the registry. Sums only disclosed
 * (non-null) power and capex; groups by operator and by country+region;
 * counts by status and purpose. upcoming is every entry whose status is
 * not operational and that has a first_power, sorted ascending by
 * first_power. today seeds generated_from.
 */
export function buildBuildoutAggregate(entries: DatacenterEntry[], today: string): BuildoutAggregate {
  let disclosedPower = 0;
  let disclosedCapex = 0;
  let withPower = 0;

  const byStatus: Record<DatacenterStatus, number> = {
    announced: 0,
    under_construction: 0,
    operational: 0,
    expansion: 0,
    paused: 0,
  };
  const byPurpose: Record<DatacenterPurpose, number> = {
    training: 0,
    inference: 0,
    mixed: 0,
    unknown: 0,
  };

  const operatorMap = new Map<string, { operator: string; projects: number; disclosed_power_mw: number }>();
  const regionMap = new Map<string, { country: string; region: string; projects: number; disclosed_power_mw: number }>();
  const upcoming: BuildoutAggregate['upcoming'] = [];

  for (const d of entries) {
    if (d.power_mw !== null) {
      disclosedPower += d.power_mw;
      withPower += 1;
    }
    if (d.capex_usd_b !== null) {
      disclosedCapex += d.capex_usd_b;
    }

    byStatus[d.status] += 1;
    byPurpose[d.purpose] += 1;

    const op = operatorMap.get(d.operator) ?? { operator: d.operator, projects: 0, disclosed_power_mw: 0 };
    op.projects += 1;
    op.disclosed_power_mw += d.power_mw ?? 0;
    operatorMap.set(d.operator, op);

    const regionKey = `${d.country}|${d.region}`;
    const reg = regionMap.get(regionKey) ?? { country: d.country, region: d.region, projects: 0, disclosed_power_mw: 0 };
    reg.projects += 1;
    reg.disclosed_power_mw += d.power_mw ?? 0;
    regionMap.set(regionKey, reg);

    if (d.status !== 'operational' && d.first_power !== null) {
      upcoming.push({
        id: d.id,
        operator: d.operator,
        project_name: d.project_name,
        first_power: d.first_power,
        power_mw: d.power_mw,
      });
    }
  }

  const byOperator = Array.from(operatorMap.values()).sort((a, b) => {
    if (b.disclosed_power_mw !== a.disclosed_power_mw) return b.disclosed_power_mw - a.disclosed_power_mw;
    return b.projects - a.projects;
  });

  const byRegion = Array.from(regionMap.values()).sort((a, b) => {
    if (b.disclosed_power_mw !== a.disclosed_power_mw) return b.disclosed_power_mw - a.disclosed_power_mw;
    return b.projects - a.projects;
  });

  upcoming.sort((a, b) => (a.first_power < b.first_power ? -1 : a.first_power > b.first_power ? 1 : 0));

  return {
    generated_from: today,
    totals: {
      projects: entries.length,
      disclosed_power_mw: disclosedPower,
      disclosed_capex_usd_b: disclosedCapex,
      with_power_disclosed: withPower,
    },
    by_operator: byOperator,
    by_region: byRegion,
    by_status: byStatus,
    by_purpose: byPurpose,
    upcoming,
    attribution: DATACENTERS_ATTRIBUTION,
  };
}
