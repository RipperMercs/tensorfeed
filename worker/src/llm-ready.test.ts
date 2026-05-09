import { describe, it, expect } from 'vitest';
import {
  transformCveRecord,
  transformKevEntry,
  transformEpssScore,
  LLM_READY_CLEANING_VERSION,
  __test,
} from './llm-ready';

describe('severityBand', () => {
  it('maps cvss scores to bands', () => {
    expect(__test.severityBand(null)).toBe('none');
    expect(__test.severityBand(0)).toBe('none');
    expect(__test.severityBand(2.0)).toBe('low');
    expect(__test.severityBand(5.5)).toBe('medium');
    expect(__test.severityBand(8.0)).toBe('high');
    expect(__test.severityBand(9.5)).toBe('critical');
    expect(__test.severityBand(10)).toBe('critical');
  });
});

describe('epssRiskBand', () => {
  it('maps EPSS probabilities to bands', () => {
    expect(__test.epssRiskBand(null)).toBe('low');
    expect(__test.epssRiskBand(0.01)).toBe('low');
    expect(__test.epssRiskBand(0.1)).toBe('medium');
    expect(__test.epssRiskBand(0.7)).toBe('high');
    expect(__test.epssRiskBand(0.95)).toBe('critical');
  });
});

describe('transformCveRecord', () => {
  const SAMPLE: unknown = {
    dataType: 'CVE_RECORD',
    dataVersion: '5.2',
    cveMetadata: {
      cveId: 'CVE-2024-3094',
      assignerOrgId: '53f830b8-...',
      assignerShortName: 'redhat',
      state: 'PUBLISHED',
      datePublished: '2024-03-29T16:51:12.588Z',
      dateUpdated: '2025-11-20T07:17:48.594Z',
    },
    containers: {
      cna: {
        descriptions: [
          { lang: 'en', value: 'Malicious code in xz upstream tarballs.' },
          { lang: 'es', value: 'Codigo malicioso en xz.' },
        ],
        metrics: [
          {
            cvssV3_1: {
              baseScore: 10,
              baseSeverity: 'CRITICAL',
              vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
            },
          },
        ],
        problemTypes: [
          { descriptions: [{ cweId: 'CWE-506' }, { cweId: 'CWE-1357' }] },
        ],
        affected: [
          { vendor: 'xz', product: 'liblzma' },
          { vendor: 'Red Hat', product: 'Fedora' },
          { vendor: 'xz', product: 'liblzma' },
        ],
        references: [
          { url: 'https://www.openwall.com/lists/oss-security/2024/03/29/4' },
          { url: 'https://access.redhat.com/security/cve/CVE-2024-3094' },
          { url: 'https://github.com/tukaani-project/xz' },
          { url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-3094' },
          { url: 'https://example.com/extra-1' },
          { url: 'https://example.com/extra-2' },
        ],
      },
    },
  };

  it('flattens core fields and computes severity_band', () => {
    const out = transformCveRecord(SAMPLE);
    expect(out.cleaning_version).toBe(LLM_READY_CLEANING_VERSION);
    expect(out.source).toBe('MITRE CVE List');
    expect(out.data.id).toBe('CVE-2024-3094');
    expect(out.data.published_at).toBe('2024-03-29T16:51:12.588Z');
    expect(out.data.cvss_v3_1_score).toBe(10);
    expect(out.data.cvss_v3_1_severity).toBe('CRITICAL');
    expect(out.data.severity_band).toBe('critical');
    expect(out.data.summary).toBe('Malicious code in xz upstream tarballs.');
  });

  it('extracts CWE list deduped', () => {
    const out = transformCveRecord(SAMPLE);
    expect(out.data.cwes).toEqual(['CWE-506', 'CWE-1357']);
  });

  it('flattens vendor + product into combined strings, deduped', () => {
    const out = transformCveRecord(SAMPLE);
    expect(out.data.affected_products).toEqual(['xz liblzma', 'Red Hat Fedora']);
    expect(out.data.affected_count).toBe(2);
  });

  it('caps references_top at 5 but keeps the count accurate', () => {
    const out = transformCveRecord(SAMPLE);
    expect(out.data.references_count).toBe(6);
    expect(out.data.references_top).toHaveLength(5);
  });

  it('handles a minimal record without crashing', () => {
    const out = transformCveRecord({ cveMetadata: { cveId: 'CVE-2026-0001' } });
    expect(out.data.id).toBe('CVE-2026-0001');
    expect(out.data.summary).toBeNull();
    expect(out.data.cvss_v3_1_score).toBeNull();
    expect(out.data.severity_band).toBe('none');
    expect(out.data.cwes).toEqual([]);
    expect(out.data.affected_products).toEqual([]);
  });

  it('handles entirely empty input', () => {
    const out = transformCveRecord({});
    expect(out.data.id).toBeNull();
    expect(out.data.severity_band).toBe('none');
  });

  it('produces a wrapped envelope with versioning', () => {
    const out = transformCveRecord(SAMPLE);
    expect(out.schema_version).toBe('1.0');
    expect(out.cleaning_version).toBe(LLM_READY_CLEANING_VERSION);
    expect(typeof out.transformed_at).toBe('string');
    expect(out.transformed_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe('transformKevEntry', () => {
  const SAMPLE = {
    cveID: 'CVE-2026-42208',
    vendorProject: 'BerriAI',
    product: 'LiteLLM',
    vulnerabilityName: 'BerriAI LiteLLM SQL Injection',
    dateAdded: '2026-05-08',
    shortDescription: 'SQL injection in LiteLLM proxy.',
    requiredAction: 'Apply mitigations.',
    dueDate: '2026-05-11',
    knownRansomwareCampaignUse: 'Unknown',
    notes:
      'https://github.com/BerriAI/litellm/security/advisories/GHSA-r75f-5x8p-qvmc ; https://nvd.nist.gov/vuln/detail/CVE-2026-42208',
    cwes: ['CWE-89'],
  };

  it('flattens fields and normalizes ransomware use', () => {
    const out = transformKevEntry(SAMPLE);
    expect(out.data.cve_id).toBe('CVE-2026-42208');
    expect(out.data.vendor).toBe('BerriAI');
    expect(out.data.product).toBe('LiteLLM');
    expect(out.data.ransomware_use).toBe('unknown');
    expect(out.data.cwes).toEqual(['CWE-89']);
  });

  it('extracts URLs from the notes field', () => {
    const out = transformKevEntry(SAMPLE);
    expect(out.data.notes_urls).toHaveLength(2);
    expect(out.data.notes_urls[0]).toMatch(/^https:\/\/github\.com/);
  });

  it('maps "Known" ransomware use to yes', () => {
    const out = transformKevEntry({ ...SAMPLE, knownRansomwareCampaignUse: 'Known' });
    expect(out.data.ransomware_use).toBe('yes');
  });

  it('handles missing notes gracefully', () => {
    const out = transformKevEntry({ ...SAMPLE, notes: '' });
    expect(out.data.notes_urls).toEqual([]);
  });
});

describe('transformEpssScore', () => {
  it('flattens current and computes risk_band', () => {
    const out = transformEpssScore({
      cve: 'CVE-2024-3094',
      epss: '0.850580000',
      percentile: '0.993590000',
      date: '2026-05-08',
    });
    expect(out.data.cve_id).toBe('CVE-2024-3094');
    expect(out.data.epss_probability).toBeCloseTo(0.85058);
    expect(out.data.percentile).toBeCloseTo(0.99359);
    expect(out.data.risk_band).toBe('high');
    expect(out.data.series_points).toBe(0);
  });

  it('summarizes a time-series with first/min/max', () => {
    const out = transformEpssScore({
      cve: 'CVE-2024-3094',
      epss: '0.85',
      percentile: '0.99',
      date: '2026-05-08',
      'time-series': [
        { date: '2026-05-07', epss: '0.85' },
        { date: '2026-05-06', epss: '0.84' },
        { date: '2026-05-05', epss: '0.86' },
        { date: '2026-05-04', epss: '0.83' },
      ],
    });
    expect(out.data.series_points).toBe(4);
    expect(out.data.series_first?.date).toBe('2026-05-04');
    expect(out.data.series_min?.epss).toBeCloseTo(0.83);
    expect(out.data.series_max?.epss).toBeCloseTo(0.86);
  });

  it('handles malformed input cleanly', () => {
    const out = transformEpssScore({});
    expect(out.data.cve_id).toBeNull();
    expect(out.data.epss_probability).toBeNull();
    expect(out.data.risk_band).toBe('low');
    expect(out.data.series_points).toBe(0);
  });
});

describe('LLM_READY_CLEANING_VERSION', () => {
  it('is set to a stable value', () => {
    expect(LLM_READY_CLEANING_VERSION).toBe('1.0');
  });
});
