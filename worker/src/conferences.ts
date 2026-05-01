/**
 * AI conferences calendar.
 *
 * Major AI research conferences and industry events with dates,
 * locations, submission deadlines, and registration links.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/conferences (free, cached 600s).
 */

export interface Conference {
  id: string;
  name: string;
  category: 'research' | 'industry' | 'developer' | 'community';
  /** ISO date of opening day. */
  startDate: string;
  /** ISO date of closing day. */
  endDate: string;
  city: string;
  country: string;
  /** In-person, virtual, or hybrid. */
  format: 'in-person' | 'virtual' | 'hybrid';
  /** Submission deadline for papers (research only). */
  paperDeadline: string | null;
  /** Whether registration is open (or expected to open before the event). */
  registrationOpen: boolean;
  /** Notable invited speakers / themes. */
  themes: string[];
  url: string;
  notes: string;
}

export const CONFERENCES: Conference[] = [
  // ── 2026 research ───────────────────────────────────
  { id: 'iclr-2026', name: 'ICLR 2026', category: 'research', startDate: '2026-04-25', endDate: '2026-04-29', city: 'Singapore', country: 'Singapore', format: 'hybrid', paperDeadline: '2025-09-26', registrationOpen: true, themes: ['representation learning', 'foundation models', 'agents', 'safety'], url: 'https://iclr.cc/Conferences/2026', notes: 'International Conference on Learning Representations. Top deep-learning venue along with NeurIPS and ICML. 2026 returns to Singapore.' },
  { id: 'icml-2026', name: 'ICML 2026', category: 'research', startDate: '2026-07-12', endDate: '2026-07-18', city: 'Vancouver', country: 'Canada', format: 'hybrid', paperDeadline: '2026-01-30', registrationOpen: false, themes: ['ML theory', 'foundation models', 'reinforcement learning', 'fairness'], url: 'https://icml.cc/Conferences/2026', notes: 'International Conference on Machine Learning. Co-flagship with NeurIPS. Vancouver venue.' },
  { id: 'neurips-2026', name: 'NeurIPS 2026', category: 'research', startDate: '2026-12-08', endDate: '2026-12-13', city: 'Vancouver', country: 'Canada', format: 'hybrid', paperDeadline: '2026-05-15', registrationOpen: false, themes: ['neural networks', 'foundation models', 'AGI', 'datasets', 'safety'], url: 'https://neurips.cc/Conferences/2026', notes: 'Largest AI/ML research conference. 15k+ attendees. Datasets + Benchmarks track is the canonical venue for new evaluations.' },
  { id: 'colm-2026', name: 'COLM 2026', category: 'research', startDate: '2026-10-07', endDate: '2026-10-10', city: 'Cambridge, MA', country: 'USA', format: 'in-person', paperDeadline: '2026-03-25', registrationOpen: false, themes: ['language models', 'evaluation', 'alignment', 'multilingual'], url: 'https://colmweb.org', notes: 'Conference on Language Modeling. Newer venue (founded 2024) focused specifically on LLMs. Higher acceptance rate than NeurIPS for LLM-only work.' },
  { id: 'aaai-2026', name: 'AAAI 2026', category: 'research', startDate: '2026-01-20', endDate: '2026-01-27', city: 'Philadelphia', country: 'USA', format: 'in-person', paperDeadline: '2025-08-15', registrationOpen: false, themes: ['AI broadly', 'agents', 'planning', 'reasoning'], url: 'https://aaai.org/conference/aaai/aaai-26/', notes: 'AAAI Conference on Artificial Intelligence. Broadest AI venue (covers more than just deep learning). Big presence from China-based research.' },
  { id: 'acl-2026', name: 'ACL 2026', category: 'research', startDate: '2026-08-03', endDate: '2026-08-08', city: 'Marseille', country: 'France', format: 'hybrid', paperDeadline: '2026-02-15', registrationOpen: false, themes: ['NLP', 'multilingual', 'computational linguistics', 'discourse'], url: 'https://2026.aclweb.org', notes: 'Annual Meeting of the Association for Computational Linguistics. The traditional NLP venue; LLM submissions dominate post-2022.' },
  { id: 'emnlp-2026', name: 'EMNLP 2026', category: 'research', startDate: '2026-11-15', endDate: '2026-11-19', city: 'Doha', country: 'Qatar', format: 'in-person', paperDeadline: '2026-06-15', registrationOpen: false, themes: ['empirical methods in NLP', 'evaluation', 'multilingual'], url: 'https://2026.emnlp.org', notes: 'Empirical Methods in Natural Language Processing. Companion to ACL.' },
  { id: 'cvpr-2026', name: 'CVPR 2026', category: 'research', startDate: '2026-06-14', endDate: '2026-06-19', city: 'Nashville', country: 'USA', format: 'in-person', paperDeadline: '2025-11-14', registrationOpen: true, themes: ['computer vision', 'multimodal', 'generative', '3D'], url: 'https://cvpr.thecvf.com/Conferences/2026', notes: 'Conference on Computer Vision and Pattern Recognition. Top vision venue. Multimodal LLM submissions surging in 2026.' },

  // ── 2026 industry ───────────────────────────────────
  { id: 'google-io-2026', name: 'Google I/O 2026', category: 'industry', startDate: '2026-05-13', endDate: '2026-05-14', city: 'Mountain View, CA', country: 'USA', format: 'hybrid', paperDeadline: null, registrationOpen: true, themes: ['Gemini', 'Android', 'Workspace AI', 'developer tools'], url: 'https://io.google', notes: 'Google\'s annual developer conference. Major Gemini announcement venue.' },
  { id: 'wwdc-2026', name: 'Apple WWDC 2026', category: 'industry', startDate: '2026-06-08', endDate: '2026-06-12', city: 'Cupertino, CA', country: 'USA', format: 'hybrid', paperDeadline: null, registrationOpen: false, themes: ['Apple Intelligence', 'iOS', 'macOS', 'on-device AI'], url: 'https://developer.apple.com/wwdc26/', notes: 'Apple\'s developer conference. On-device AI announcements + Apple Intelligence updates.' },
  { id: 'aws-reinvent-2026', name: 'AWS re:Invent 2026', category: 'industry', startDate: '2026-11-30', endDate: '2026-12-04', city: 'Las Vegas, NV', country: 'USA', format: 'hybrid', paperDeadline: null, registrationOpen: false, themes: ['Bedrock', 'Trainium', 'AI infrastructure', 'enterprise AI'], url: 'https://reinvent.awsevents.com', notes: 'AWS\'s annual customer conference. Major Bedrock + Trainium announcements; Anthropic typically appears in keynotes.' },
  { id: 'microsoft-build-2026', name: 'Microsoft Build 2026', category: 'industry', startDate: '2026-05-19', endDate: '2026-05-22', city: 'Seattle, WA', country: 'USA', format: 'hybrid', paperDeadline: null, registrationOpen: true, themes: ['Copilot', 'Azure AI', 'GitHub Copilot', 'agents'], url: 'https://build.microsoft.com', notes: 'Microsoft\'s developer conference. Copilot ecosystem + Azure AI announcements.' },
  { id: 'gtc-2026', name: 'NVIDIA GTC 2026', category: 'industry', startDate: '2026-03-16', endDate: '2026-03-19', city: 'San Jose, CA', country: 'USA', format: 'hybrid', paperDeadline: null, registrationOpen: false, themes: ['Blackwell', 'AI factories', 'Omniverse', 'robotics'], url: 'https://www.nvidia.com/gtc/', notes: 'NVIDIA\'s GPU Technology Conference. Major chip + AI infrastructure announcements; Jensen keynote is the AI hardware industry\'s State of the Union.' },
  { id: 'openai-devday-2026', name: 'OpenAI DevDay 2026', category: 'industry', startDate: '2026-10-06', endDate: '2026-10-06', city: 'San Francisco, CA', country: 'USA', format: 'in-person', paperDeadline: null, registrationOpen: false, themes: ['GPT', 'Apps SDK', 'agents', 'Workspace Agents'], url: 'https://openai.com/devday/', notes: 'OpenAI\'s annual developer conference. Major API + Apps SDK announcements.' },
  { id: 'anthropic-builder-day-2026', name: 'Anthropic Builder Day 2026', category: 'industry', startDate: '2026-10-22', endDate: '2026-10-22', city: 'San Francisco, CA', country: 'USA', format: 'hybrid', paperDeadline: null, registrationOpen: false, themes: ['Claude Code', 'MCP', 'agent SDK', 'Claude API'], url: 'https://www.anthropic.com/events', notes: 'Anthropic\'s annual builder event. Claude Code + MCP + Agent SDK announcements.' },
  { id: 'cursor-conf-2026', name: 'Cursor Conf 2026', category: 'developer', startDate: '2026-09-23', endDate: '2026-09-23', city: 'San Francisco, CA', country: 'USA', format: 'in-person', paperDeadline: null, registrationOpen: false, themes: ['Cursor agents', 'AI coding', 'IDE'], url: 'https://cursor.com', notes: 'Cursor\'s annual user conference. Coding agent + IDE direction announcements.' },
  { id: 'aiengineer-summit-2026', name: 'AI Engineer World\'s Fair', category: 'developer', startDate: '2026-06-02', endDate: '2026-06-04', city: 'San Francisco, CA', country: 'USA', format: 'in-person', paperDeadline: null, registrationOpen: true, themes: ['production AI', 'agents', 'evals', 'RAG'], url: 'https://ai.engineer', notes: 'Largest practitioner-focused AI engineering conference. swyx-organized; standard ground-truth check on what\'s working in production.' },
  { id: 'maven-llm-bootcamp-2026', name: 'Maven LLM Bootcamp', category: 'developer', startDate: '2026-09-15', endDate: '2026-10-15', city: 'Online', country: 'Worldwide', format: 'virtual', paperDeadline: null, registrationOpen: true, themes: ['practical LLMs', 'fine-tuning', 'evals'], url: 'https://maven.com', notes: 'Hugo Bowne-Anderson-organized cohort-based course. Strong production-AI curriculum.' },
];

export const CONFERENCES_LAST_UPDATED = '2026-04-30';
