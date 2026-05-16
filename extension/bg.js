/*
 * TensorFeed AI Status, background service worker.
 *
 * Polls /api/status/summary on a 5 minute alarm and colors the toolbar
 * badge so you see AI health at a glance without opening the popup.
 *
 * Honesty mirrors the widget: vendor status is authoritative. A "down"
 * provider turns the badge red, "degraded" turns it amber, otherwise
 * green. "unknown" (no status source) is NOT escalated, same decision
 * as the widget's condition logic, so a coverage gap never cries wolf.
 *
 * Cross-browser: Chrome exposes `chrome`, Firefox `browser`; both
 * support the MV3 APIs used here.
 */

const api = globalThis.browser || globalThis.chrome;
const STATUS_URL = 'https://tensorfeed.ai/api/status/summary';
const ALARM = 'tf-status-poll';

const COLOR = { green: '#10b981', amber: '#f59e0b', red: '#ef4444' };

function classify(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'down' || v === 'outage' || v === 'major') return 'red';
  if (v === 'degraded' || v === 'partial' || v === 'warn') return 'amber';
  return 'green'; // operational or unknown (unknown does not escalate)
}

async function refresh() {
  try {
    const res = await fetch(STATUS_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('status ' + res.status);
    const data = await res.json();
    const services = Array.isArray(data && data.services) ? data.services : [];
    let down = 0;
    let degraded = 0;
    for (const s of services) {
      const c = classify(s && s.status);
      if (c === 'red') down++;
      else if (c === 'amber') degraded++;
    }
    const level = down > 0 ? 'red' : degraded > 0 ? 'amber' : 'green';
    await api.action.setBadgeBackgroundColor({ color: COLOR[level] });
    await api.action.setBadgeText({ text: level === 'green' ? '' : String(down || degraded) });
    const title =
      level === 'green'
        ? 'TensorFeed AI Status: all systems operational'
        : level === 'amber'
          ? `TensorFeed AI Status: ${degraded} degraded`
          : `TensorFeed AI Status: ${down} down, ${degraded} degraded`;
    await api.action.setTitle({ title });
  } catch (e) {
    // Network blip or feed unavailable: clear the badge rather than
    // show a stale or false alarm. The popup still loads the live widget.
    try {
      await api.action.setBadgeText({ text: '' });
      await api.action.setTitle({ title: 'TensorFeed AI Status' });
    } catch (_) {
      /* no-op */
    }
  }
}

api.runtime.onInstalled.addListener(() => {
  api.alarms.create(ALARM, { periodInMinutes: 5 });
  refresh();
});

api.runtime.onStartup && api.runtime.onStartup.addListener(() => {
  api.alarms.create(ALARM, { periodInMinutes: 5 });
  refresh();
});

api.alarms.onAlarm.addListener((a) => {
  if (a && a.name === ALARM) refresh();
});
