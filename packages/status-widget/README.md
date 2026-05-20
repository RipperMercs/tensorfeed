# @tensorfeed/status-widget

Drop the live [TensorFeed](https://tensorfeed.ai) AI status monitor onto
any site with one line. Real-time operational status and p95 latency for
every major AI provider and service, in a self-contained sci-fi console.
Free, no API key, no tracking, zero dependencies.

Live preview and docs: https://tensorfeed.ai/embed

Prefer it in your toolbar? The same Live Monitor ships as a Chrome
extension: [install on the Web Store](https://chrome.google.com/webstore/detail/pdmcjopgilbnggocemjjncpcenpmglde).

## Install

```sh
npm install @tensorfeed/status-widget
```

## Use it (any framework, or none)

```js
import '@tensorfeed/status-widget';
```

```html
<tensorfeed-status accent="blue" poll="30" height="600"></tensorfeed-status>
```

The custom element renders the widget in a shadow root, so host-page CSS
cannot affect it and it cannot affect your page.

### React

No custom element needed. Use the URL helper:

```jsx
import { tensorfeedStatusSrc } from '@tensorfeed/status-widget';

<iframe
  src={tensorfeedStatusSrc({ accent: 'blue' })}
  title="TensorFeed live AI status"
  loading="lazy"
  style={{ width: '100%', maxWidth: 720, height: 600, border: 0 }}
/>
```

### Plain HTML, no build

```html
<script type="module">
  import 'https://esm.sh/@tensorfeed/status-widget';
</script>
<tensorfeed-status></tensorfeed-status>
```

## Attributes

| Attribute | Values | Default | Notes |
|---|---|---|---|
| `accent` | `blue` \| `auto` \| `green` | `blue` | `blue` is a light-blue spine with green status indicators. `auto` greens the whole accent when all systems are nominal. `green` forces green. |
| `poll` | `5` to `600` | `30` | Client poll interval in seconds. Raise it on low-traffic pages. |
| `height` | px number or any CSS length | `600` | Widget caps at 720px wide and reflows down to ~320px. |
| `label` | string | `TensorFeed live AI status` | Accessible iframe title. |

## What it shows

Operational status and probed p95 latency where TensorFeed measures it,
real 7-day uptime % otherwise. Vendor status is authoritative; a
provider with no status source is shown as "no data", never a false
alarm. "Detail" deep-links to the per-provider page on tensorfeed.ai.

## License

MIT. The widget data comes from the public TensorFeed endpoints
`/api/status/summary` and `/api/status/leaderboard`.
