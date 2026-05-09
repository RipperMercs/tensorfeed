import { describe, it, expect } from 'vitest';
import {
  transformCveRecord,
  transformKevEntry,
  transformEpssScore,
  transformNasaPowerPoint,
  transformEiaSeries,
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

describe('isoDateFromYYYYMMDD', () => {
  it('converts YYYYMMDD to YYYY-MM-DD', () => {
    expect(__test.isoDateFromYYYYMMDD('20260108')).toBe('2026-01-08');
  });
  it('converts YYYYMMDDHH to ISO timestamp', () => {
    expect(__test.isoDateFromYYYYMMDD('2026010814')).toBe('2026-01-08T14:00:00Z');
  });
  it('passes other strings through', () => {
    expect(__test.isoDateFromYYYYMMDD('not-a-date')).toBe('not-a-date');
  });
});

describe('deltaPct', () => {
  it('computes percent change rounded to 2 decimals', () => {
    expect(__test.deltaPct(110, 100)).toBe(10);
    expect(__test.deltaPct(95, 100)).toBe(-5);
    expect(__test.deltaPct(78.42, 75.13)).toBeCloseTo(4.38, 1);
  });
  it('returns null for division by zero', () => {
    expect(__test.deltaPct(10, 0)).toBeNull();
  });
  it('returns null for null inputs', () => {
    expect(__test.deltaPct(null, 100)).toBeNull();
    expect(__test.deltaPct(100, null)).toBeNull();
  });
});

describe('transformNasaPowerPoint', () => {
  const SAMPLE = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-118.244, 34.052, 395.0] },
    properties: {
      parameter: {
        T2M: { '20260101': 13.57, '20260102': 14.07, '20260103': 13.44 },
        PRECTOTCORR: { '20260101': 21.84, '20260102': 5.71, '20260103': 15.77 },
      },
    },
    header: { sources: ['MERRA2'] },
    parameters: {
      T2M: { units: 'C', longname: 'Temperature at 2 Meters' },
      PRECTOTCORR: { units: 'mm/day', longname: 'Precipitation Corrected' },
    },
  };

  it('pivots parameter-keyed data into date-keyed rows', () => {
    const out = transformNasaPowerPoint(SAMPLE);
    expect(out.data.rows).toHaveLength(3);
    expect(out.data.rows[0]).toEqual({
      date: '2026-01-01',
      T2M: 13.57,
      PRECTOTCORR: 21.84,
    });
    expect(out.data.rows[2].T2M).toBe(13.44);
  });

  it('extracts location and elevation', () => {
    const out = transformNasaPowerPoint(SAMPLE);
    expect(out.data.location).toEqual({
      latitude: 34.052,
      longitude: -118.244,
      elevation_meters: 395,
    });
  });

  it('preserves parameter metadata', () => {
    const out = transformNasaPowerPoint(SAMPLE);
    expect(out.data.parameters_meta.T2M.units).toBe('C');
    expect(out.data.parameters_meta.PRECTOTCORR.longname).toBe('Precipitation Corrected');
  });

  it('coerces NASA fill values (-999) to null', () => {
    const out = transformNasaPowerPoint({
      ...SAMPLE,
      properties: {
        parameter: {
          T2M: { '20260101': -999, '20260102': 14.07 },
        },
      },
      parameters: { T2M: { units: 'C', longname: 'Temperature' } },
    });
    expect(out.data.rows[0].T2M).toBeNull();
    expect(out.data.rows[1].T2M).toBe(14.07);
  });

  it('reports row count and date range in summary', () => {
    const out = transformNasaPowerPoint(SAMPLE);
    expect(out.data.summary.row_count).toBe(3);
    expect(out.data.summary.date_start).toBe('2026-01-01');
    expect(out.data.summary.date_end).toBe('2026-01-03');
    expect(out.data.summary.parameter_count).toBe(2);
    expect(out.data.summary.sources).toEqual(['MERRA2']);
  });

  it('handles empty input gracefully', () => {
    const out = transformNasaPowerPoint({});
    expect(out.data.rows).toEqual([]);
    expect(out.data.summary.row_count).toBe(0);
    expect(out.data.location.latitude).toBeNull();
  });
});

describe('transformEiaSeries', () => {
  const SAMPLE_MONTHLY = {
    response: {
      total: 1234,
      dateFormat: 'YYYY-MM',
      frequency: 'monthly',
      description: 'WTI Crude Oil Spot Price',
      data: [
        { period: '2026-04', value: '78.42', unit: 'dollars per barrel' },
        { period: '2026-03', value: '75.13', unit: 'dollars per barrel' },
        { period: '2025-04', value: '82.05', unit: 'dollars per barrel' },
        { period: '2025-03', value: '79.91', unit: 'dollars per barrel' },
      ],
    },
  };

  it('sorts points ascending and extracts numeric values', () => {
    const out = transformEiaSeries(SAMPLE_MONTHLY);
    expect(out.data.points).toHaveLength(4);
    expect(out.data.points[0].period).toBe('2025-03');
    expect(out.data.points[3].period).toBe('2026-04');
    expect(out.data.points[3].value).toBe(78.42);
  });

  it('extracts primary_units from first point with a unit', () => {
    const out = transformEiaSeries(SAMPLE_MONTHLY);
    expect(out.data.primary_units).toBe('dollars per barrel');
  });

  it('computes MoM delta from the two most-recent points', () => {
    const out = transformEiaSeries(SAMPLE_MONTHLY);
    expect(out.data.summary.mom_delta_pct).toBeCloseTo(4.38, 1);
  });

  it('computes YoY delta from the same period one year prior', () => {
    const out = transformEiaSeries(SAMPLE_MONTHLY);
    expect(out.data.summary.yoy_delta_pct).toBeCloseTo(-4.42, 1);
  });

  it('reports first / latest / min / max points', () => {
    const out = transformEiaSeries(SAMPLE_MONTHLY);
    expect(out.data.summary.first?.period).toBe('2025-03');
    expect(out.data.summary.latest?.period).toBe('2026-04');
    expect(out.data.summary.min?.value).toBe(75.13);
    expect(out.data.summary.max?.value).toBe(82.05);
  });

  it('handles annual periods (YYYY) for YoY math', () => {
    const out = transformEiaSeries({
      response: {
        frequency: 'annual',
        dateFormat: 'YYYY',
        data: [
          { period: '2026', value: '100', unit: 'units' },
          { period: '2025', value: '95', unit: 'units' },
        ],
      },
    });
    expect(out.data.summary.yoy_delta_pct).toBeCloseTo(5.26, 1);
  });

  it('handles missing values cleanly', () => {
    const out = transformEiaSeries({
      response: {
        frequency: 'monthly',
        dateFormat: 'YYYY-MM',
        data: [
          { period: '2026-04', value: 'Not Available', unit: 'units' },
          { period: '2026-03', value: '50', unit: 'units' },
        ],
      },
    });
    expect(out.data.summary.latest?.value).toBe(50);
    expect(out.data.summary.mom_delta_pct).toBeNull();
  });

  it('handles entirely empty input', () => {
    const out = transformEiaSeries({});
    expect(out.data.points).toEqual([]);
    expect(out.data.summary.count).toBe(0);
  });
});

describe('LLM_READY_CLEANING_VERSION', () => {
  it('is set to a stable value', () => {
    expect(LLM_READY_CLEANING_VERSION).toBe('1.0');
  });
});
