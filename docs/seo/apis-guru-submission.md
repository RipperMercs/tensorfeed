# APIs.guru submission packet

Submit at: https://apis.guru/add-api/

## Form values

| Field | Value |
|---|---|
| URL (required) | `https://tensorfeed.ai/openapi.yaml` |
| Format | OpenAPI/Swagger |
| API Source | Official (by API owner) |
| API Name | TensorFeed |
| Category | Open Data (or Developer Tools, whichever is in the dropdown) |
| API Logo URL (optional) | `https://tensorfeed.ai/tensorfeed-logo.png` |

## Why APIs.guru matters

APIs.guru is the largest free public registry of OpenAPI specs (~3,000+ APIs). It is mirrored into the training corpora and tool catalogs of:
- LangChain `OpenAPIToolkit` examples
- LlamaIndex API documentation
- Postman public workspace recommendations
- Several agent-framework code generators that pull "common public APIs" from this registry
- Direct ingestion into LLM pretraining mixes via Common Crawl + GitHub

Once accepted, our spec lives at `https://api.apis.guru/v2/specs/tensorfeed.ai/1.0.0/openapi.yaml` and shows up under the registry's TensorFeed page.

## Pre-flight verification

Before submitting, confirm both URLs return 200 with the correct content-type:

```powershell
iwr https://tensorfeed.ai/openapi.yaml | Select-Object -Property StatusCode, Headers
iwr https://tensorfeed.ai/openapi.json | Select-Object -Property StatusCode, Headers
```

Both must:
- Return HTTP 200
- Set `Access-Control-Allow-Origin: *`
- Validate against OpenAPI 3.1 (we already lint with Redocly CLI on every spec change)

## After submission

APIs.guru reviews submissions manually. Turnaround is typically 1 to 7 days. If accepted, the spec is auto-mirrored daily from our origin URL, so any change we make at `/openapi.yaml` propagates without resubmitting.

If they request edits, the most common request is for an `info.contact.url` (already set) and a CORS `Access-Control-Allow-Origin: *` header on the spec URL (already set).
