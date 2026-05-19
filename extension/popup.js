/*
 * TensorFeed AI Status, popup controller.
 *
 * The rich experience is the live widget framed in an <iframe>. But a
 * cross-origin frame can be refused (CSP frame-ancestors, a sandboxed
 * store-review browser, an offline network), and a blank toolbar popup
 * reads as "non-functional". So the popup ALWAYS renders a self-contained
 * status list from /api/status/summary first, then swaps to the iframe
 * only once it genuinely loads. A blocked frame never fires `load`, so
 * the fallback simply stays. The popup is therefore never blank.
 *
 * No extension APIs are used here (plain fetch), so this runs unchanged
 * in Chrome and Firefox. classify() mirrors bg.js: "unknown" does not
 * escalate, same honesty rule as the widget.
 */

const SUMMARY_URL = 'https://tensorfeed.ai/api/status/summary';

function classify(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'down' || v === 'outage' || v === 'major') return 'red';
  if (v === 'degraded' || v === 'partial' || v === 'warn') return 'amber';
  return 'green'; // operational or unknown (unknown does not escalate)
}

function renderFallback(services) {
  const list = document.getElementById('list');
  const msg = document.getElementById('msg');
  list.textContent = '';

  if (!services.length) {
    msg.textContent = 'Live status is momentarily unavailable. Open the full monitor below.';
    return;
  }

  let down = 0;
  let degraded = 0;
  for (const s of services) {
    const level = classify(s && s.status);
    if (level === 'red') down++;
    else if (level === 'amber') degraded++;

    const row = document.createElement('div');
    row.className = 'row';

    const dot = document.createElement('span');
    dot.className = 'dot ' + level;
    row.appendChild(dot);

    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = (s && s.name) || 'Service';
    if (s && s.provider) {
      const pv = document.createElement('span');
      pv.className = 'pv';
      pv.textContent = '  ' + s.provider;
      nm.appendChild(pv);
    }
    row.appendChild(nm);

    const st = document.createElement('span');
    st.className = 'st';
    st.textContent = (s && s.status) || 'unknown';
    row.appendChild(st);

    list.appendChild(row);
  }

  msg.textContent =
    down > 0
      ? down + ' service' + (down === 1 ? '' : 's') + ' down' +
        (degraded ? ', ' + degraded + ' degraded' : '')
      : degraded > 0
        ? degraded + ' service' + (degraded === 1 ? '' : 's') + ' degraded'
        : 'All systems operational.';
}

async function loadFallback() {
  try {
    const res = await fetch(SUMMARY_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('status ' + res.status);
    const data = await res.json();
    const services = Array.isArray(data && data.services) ? data.services : [];
    renderFallback(services);
  } catch (_) {
    document.getElementById('msg').textContent =
      'Live status is momentarily unavailable. Open the full monitor below.';
  }
}

// Attach the load listener BEFORE navigation so a frame that loads fast
// still triggers the swap, and a blocked frame leaves the fallback up.
function mountFrame() {
  const frame = document.getElementById('frame');
  const fallback = document.getElementById('fallback');
  const src = frame.getAttribute('data-src');
  if (!src) return;
  frame.addEventListener('load', () => {
    frame.style.display = 'block';
    fallback.style.display = 'none';
  });
  frame.src = src;
}

loadFallback();
mountFrame();
