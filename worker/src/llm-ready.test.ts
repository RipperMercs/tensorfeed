import { describe, it, expect } from 'vitest';
import {
  transformCveRecord,
  transformKevEntry,
  transformEpssScore,
  transformNasaPowerPoint,
  transformEiaSeries,
  transformFdaDrugEvent,
  transformFdaDrugLabel,
  transformFdaRecall,
  transformFdaDeviceEvent,
  transformFdaQueryResults,
  attachCompressionStats,
  measureSourceBytes,
  type LlmReadyFdaDrugEvent,
  type LlmReadyFdaDrugLabel,
  type LlmReadyFdaRecall,
  type LlmReadyFdaDeviceEvent,
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

describe('transformFdaDrugEvent', () => {
  const SAMPLE = {
    safetyreportid: '10003304',
    primarysourcecountry: 'US',
    occurcountry: 'US',
    transmissiondate: '20141212',
    receivedate: '20140312',
    serious: '1',
    seriousnessdeath: '1',
    seriousnesshospitalization: '1',
    patient: {
      patientonsetage: 65,
      patientsex: '2',
      drug: [
        { medicinalproduct: 'ASPIRIN' },
        { medicinalproduct: 'IBUPROFEN' },
        { medicinalproduct: 'aspirin' },
      ],
      reaction: [
        { reactionmeddrapt: 'NAUSEA', reactionoutcome: '1' },
        { reactionmeddrapt: 'HEADACHE', reactionoutcome: '6' },
      ],
    },
  };

  it('flattens patient demographics and serious flags', () => {
    const out = transformFdaDrugEvent(SAMPLE);
    expect(out.id).toBe('10003304');
    expect(out.country).toBe('US');
    expect(out.patient_age).toBe(65);
    expect(out.patient_sex).toBe('female');
    expect(out.serious).toBe(true);
    expect(out.seriousness_flags).toContain('death');
    expect(out.seriousness_flags).toContain('hospitalization');
  });

  it('extracts drugs and reactions deduped + reports primaries', () => {
    const out = transformFdaDrugEvent(SAMPLE);
    expect(out.drugs).toEqual(['ASPIRIN', 'IBUPROFEN']);
    expect(out.reactions).toEqual(['NAUSEA', 'HEADACHE']);
    expect(out.primary_drug).toBe('ASPIRIN');
    expect(out.primary_reaction).toBe('NAUSEA');
    expect(out.drug_count).toBe(2);
    expect(out.reaction_count).toBe(2);
  });

  it('normalizes the FDA date format', () => {
    const out = transformFdaDrugEvent(SAMPLE);
    expect(out.received_at).toBe('2014-03-12');
    expect(out.occurred_at).toBe('2014-12-12');
  });

  it('handles missing fields gracefully', () => {
    const out = transformFdaDrugEvent({});
    expect(out.id).toBeNull();
    expect(out.drugs).toEqual([]);
    expect(out.serious).toBeNull();
    expect(out.patient_sex).toBeNull();
  });
});

describe('transformFdaDrugLabel', () => {
  it('extracts brand/generic/manufacturer + section text', () => {
    const out = transformFdaDrugLabel({
      id: 'abc-123',
      set_id: 'set-abc',
      effective_time: '20240501',
      openfda: {
        brand_name: ['ASPIRIN', 'aspirin'],
        generic_name: ['acetylsalicylic acid'],
        manufacturer_name: ['Bayer Pharmaceuticals'],
        product_type: ['HUMAN OTC DRUG'],
        route: ['ORAL'],
      },
      indications_and_usage: ['For relief of minor aches.'],
      warnings: ['Stop use if symptoms persist.', 'Do not use if pregnant.'],
    });
    expect(out.id).toBe('abc-123');
    expect(out.brand_names).toEqual(['ASPIRIN']);
    expect(out.generic_names).toEqual(['acetylsalicylic acid']);
    expect(out.manufacturer).toBe('Bayer Pharmaceuticals');
    expect(out.product_type).toBe('HUMAN OTC DRUG');
    expect(out.route).toEqual(['ORAL']);
    expect(out.warnings).toContain('Stop use if symptoms persist.');
    expect(out.warnings).toContain('Do not use if pregnant.');
    expect(out.effective_time).toBe('2024-05-01');
  });
});

describe('transformFdaRecall', () => {
  it('flattens enforcement report fields', () => {
    const out = transformFdaRecall({
      recall_number: 'D-1234-2024',
      status: 'Ongoing',
      classification: 'Class II',
      product_description: 'Drug ABC tablets, 100mg',
      reason_for_recall: 'Mislabeling',
      distribution_pattern: 'Nationwide',
      recalling_firm: 'Generic Pharma Co',
      voluntary_mandated: 'Voluntary: Firm initiated',
      state: 'NY',
      country: 'United States',
      recall_initiation_date: '20240515',
      report_date: '20240601',
    });
    expect(out.id).toBe('D-1234-2024');
    expect(out.classification).toBe('Class II');
    expect(out.product).toBe('Drug ABC tablets, 100mg');
    expect(out.voluntary).toBe(true);
    expect(out.initiated_at).toBe('2024-05-15');
    expect(out.reported_at).toBe('2024-06-01');
  });

  it('returns null for voluntary when neither voluntary nor mandated', () => {
    const out = transformFdaRecall({ voluntary_mandated: '' });
    expect(out.voluntary).toBeNull();
  });
});

describe('transformFdaDeviceEvent', () => {
  it('extracts primary device + outcomes + truncated narrative', () => {
    const out = transformFdaDeviceEvent({
      report_number: 'MAUDE-2024-1234',
      event_type: 'Injury',
      date_of_event: '20240515',
      date_received: '20240601',
      device: [
        {
          brand_name: 'CardioMonitor X1',
          generic_name: 'cardiac monitor',
          manufacturer_d_name: 'MedDevice Inc',
        },
      ],
      patient: [{ patient_problems: ['Hypotension', 'Bradycardia'] }],
      product_problems: ['Power Issue', 'Display Failure'],
      mdr_text: [
        { text: 'Device powered off during procedure.' },
        { text: 'No patient harm reported.' },
      ],
      type_of_report: 'Initial Report',
    });
    expect(out.id).toBe('MAUDE-2024-1234');
    expect(out.device_name).toBe('CardioMonitor X1');
    expect(out.device_manufacturer).toBe('MedDevice Inc');
    expect(out.product_problems).toEqual(['Power Issue', 'Display Failure']);
    expect(out.patient_outcomes).toEqual(['Hypotension', 'Bradycardia']);
    expect(out.narrative).toContain('Device powered off during procedure.');
    expect(out.narrative).toContain('No patient harm reported.');
  });

  it('truncates very long narratives', () => {
    const longText = 'a'.repeat(5000);
    const out = transformFdaDeviceEvent({
      mdr_text: [{ text: longText }],
    });
    expect(out.narrative).toBeTruthy();
    expect(out.narrative!.length).toBeLessThanOrEqual(4010);
    expect(out.narrative!.endsWith('...')).toBe(true);
  });
});

describe('transformFdaQueryResults', () => {
  it('dispatches to the right transformer per category', () => {
    const out = transformFdaQueryResults('drug/events', {
      meta: { results: { total: 12345 } },
      results: [
        {
          safetyreportid: '99',
          patient: { drug: [{ medicinalproduct: 'X' }], reaction: [{ reactionmeddrapt: 'Y' }] },
        },
      ],
    });
    expect(out).not.toBeNull();
    expect(out!.data.category).toBe('drug/events');
    expect(out!.data.count).toBe(1);
    expect(out!.data.upstream_total).toBe(12345);
    const r = out!.data.results[0] as LlmReadyFdaDrugEvent;
    expect(r.id).toBe('99');
    expect(r.primary_drug).toBe('X');
  });

  it('returns null for unknown category', () => {
    const out = transformFdaQueryResults('totally/bogus', { results: [] });
    expect(out).toBeNull();
  });

  it('returns null for prototype-chain keys without crashing', () => {
    // Regression: FDA_TRANSFORMERS['__proto__'] used to resolve to
    // Object.prototype and the dispatcher would invoke it on each
    // result row, throwing TypeError and 500ing the worker.
    expect(() => transformFdaQueryResults('__proto__', { results: [{}] })).not.toThrow();
    expect(transformFdaQueryResults('__proto__', { results: [{}] })).toBeNull();
    expect(transformFdaQueryResults('toString', { results: [{}] })).toBeNull();
    expect(transformFdaQueryResults('constructor', { results: [{}] })).toBeNull();
  });

  it('handles empty result arrays cleanly', () => {
    const out = transformFdaQueryResults('drug/labels', { results: [] });
    expect(out).not.toBeNull();
    expect(out!.data.count).toBe(0);
    expect(out!.data.results).toEqual([]);
  });
});

describe('measureSourceBytes', () => {
  it('returns the byte length of canonical JSON', () => {
    expect(measureSourceBytes({ a: 1 })).toBe(7); // {"a":1}
  });
  it('handles null and arrays', () => {
    expect(measureSourceBytes(null)).toBe(4); // null
    expect(measureSourceBytes([])).toBe(2);   // []
  });
});

describe('attachCompressionStats', () => {
  const SAMPLE_ENVELOPE = transformCveRecord({
    cveMetadata: { cveId: 'CVE-2026-0001' },
  });

  it('computes cleaned_bytes from the data field only', () => {
    const out = attachCompressionStats(SAMPLE_ENVELOPE, null);
    expect(out.compression_stats?.cleaned_bytes).toBeGreaterThan(0);
    expect(out.compression_stats?.source_bytes).toBeNull();
    expect(out.compression_stats?.reduction_pct).toBeNull();
    expect(out.compression_stats?.approx_tokens_saved).toBeNull();
  });

  it('computes reduction_pct and approx_tokens_saved when source_bytes is provided', () => {
    const out = attachCompressionStats(SAMPLE_ENVELOPE, 3000);
    expect(out.compression_stats?.source_bytes).toBe(3000);
    expect(out.compression_stats?.reduction_pct).toBeGreaterThan(0);
    expect(out.compression_stats?.approx_tokens_saved).toBeGreaterThan(0);
  });

  it('clamps reduction_pct to non-negative when cleaned > source', () => {
    const out = attachCompressionStats(SAMPLE_ENVELOPE, 1);
    // cleaned will exceed 1 byte; saved is clamped to 0, so pct is 0
    expect(out.compression_stats?.reduction_pct).toBe(0);
    expect(out.compression_stats?.approx_tokens_saved).toBe(0);
  });

  it('preserves all other envelope fields', () => {
    const out = attachCompressionStats(SAMPLE_ENVELOPE, 2000);
    expect(out.schema_version).toBe('1.0');
    expect(out.cleaning_version).toBe(LLM_READY_CLEANING_VERSION);
    expect(out.source).toBe('MITRE CVE List');
    expect(out.data).toEqual(SAMPLE_ENVELOPE.data);
  });

  it('rounds reduction_pct to one decimal place', () => {
    const out = attachCompressionStats(SAMPLE_ENVELOPE, 2500);
    const pct = out.compression_stats?.reduction_pct ?? 0;
    expect(pct).toBe(Math.round(pct * 10) / 10);
  });
});

describe('LLM_READY_CLEANING_VERSION', () => {
  it('is set to a stable value', () => {
    expect(LLM_READY_CLEANING_VERSION).toBe('1.0');
  });
});
