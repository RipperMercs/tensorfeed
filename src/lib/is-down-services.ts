import type { Metadata } from 'next';

/**
 * Config for the shared IsServiceDown page renderer. Each monitored provider
 * gets one entry; the page at /is-<slug>-down is a thin file that passes its
 * config to <IsServiceDown>. Content (faqs, failover, descriptions) is curated
 * per provider; statusServiceName must match the service name in /api/status
 * exactly (empty string = no live monitor, the page degrades to an unknown
 * state and points at the official status page).
 *
 * The IS_DOWN_SERVICES map is generated from the per-provider config pass; the
 * type and helper below are hand-maintained.
 */

export interface IsDownFaq {
  question: string;
  answer: string;
}

export interface IsDownFailover {
  title: string;
  text: string;
  links: { label: string; href: string }[];
}

export interface IsDownService {
  slug: string;
  displayName: string;
  statusServiceName: string;
  providerName: string;
  providerUrl: string;
  statusPageUrl: string;
  metaTitle: string;
  metaDescription: string;
  serviceDescription: string;
  faqs: IsDownFaq[];
  failover: IsDownFailover[];
}

export function buildIsDownMetadata(s: IsDownService): Metadata {
  const url = `https://tensorfeed.ai/is-${s.slug}-down`;
  return {
    title: s.metaTitle,
    description: s.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: s.metaTitle,
      description: s.metaDescription,
      siteName: 'TensorFeed.ai',
      images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
    },
    twitter: { card: 'summary', title: s.metaTitle, description: s.metaDescription },
  };
}

export const IS_DOWN_SERVICES: Record<string, IsDownService> = {
  "bedrock": {
    "slug": "bedrock",
    "displayName": "AWS Bedrock",
    "statusServiceName": "AWS Bedrock",
    "providerName": "AWS",
    "providerUrl": "https://aws.amazon.com/bedrock",
    "statusPageUrl": "https://health.aws.amazon.com/health/status",
    "metaTitle": "Is AWS Bedrock Down? Live Amazon Bedrock Status",
    "metaDescription": "Is AWS Bedrock down right now? Live Amazon Bedrock status filtered from AWS Health. See current outages, regional impact, and per-region issues for the Bedrock API.",
    "serviceDescription": "AWS Bedrock is Amazon's fully managed service for calling foundation models through one API, including Anthropic Claude, Meta Llama, Mistral, Amazon Titan and Nova, Cohere, and AI21 models. It runs inference, fine-tuning, knowledge bases, and agents inside a customer's AWS account and region.",
    "faqs": [
      {
        "question": "Is AWS Bedrock down right now?",
        "answer": "The live indicator at the top of this page is the answer. Green means no active AWS Health events are affecting Bedrock in the regions we monitor. Amber means degraded performance in at least one region, and red means a significant outage. Because Bedrock is regional, always read the affected-region list below the headline, since a problem in us-east-1 does not mean us-west-2 or eu-central-1 is impacted."
      },
      {
        "question": "How do I check AWS Bedrock status?",
        "answer": "This page pulls the AWS Health feed every two minutes and filters it down to events affecting Bedrock specifically, which is faster than scanning the full AWS dashboard by hand. The official source is the AWS Health Dashboard at health.aws.amazon.com/health/status, where you can filter by the Bedrock service and by region. For account-specific impact, the personalized AWS Health Dashboard inside your console shows events tied to the exact resources you are running."
      },
      {
        "question": "What should I do when AWS Bedrock is down?",
        "answer": "First check whether the event is regional. The standard Bedrock failover pattern is to retry in another region where the same model is enabled, since model availability and outages are per region. If the whole service is impaired, fall back to calling the model owner directly (for example the Claude API or Mistral's own API) or route through a sibling gateway. Build exponential backoff and a cross-region or cross-provider fallback into your client so a single region's event does not take your app down."
      },
      {
        "question": "How often does AWS Bedrock go down, and how reliable is it?",
        "answer": "Bedrock is generally reliable and most weeks see no customer-facing outage, but it inherits the blast radius of core AWS infrastructure. Large regional AWS events (networking, IAM, or DynamoDB issues in a region like us-east-1) can cascade into Bedrock invocation errors and throttling even when the model layer itself is fine. Throttling and capacity limits during peak demand are a more common day-to-day issue than full outages, especially for newer or high-demand models, which is why provisioned throughput exists."
      },
      {
        "question": "Which models and services does AWS Bedrock actually run?",
        "answer": "Bedrock is a managed gateway, not a single model. It serves Anthropic Claude, Meta Llama, Mistral and Mixtral, Amazon's own Titan and Nova families, Cohere, AI21, and Stability image models, plus features like Knowledge Bases, Agents, Guardrails, and fine-tuning. A common confusion is mixing it up with Amazon SageMaker (which is for training and hosting your own models) or assuming a model is available everywhere. Model and feature availability varies by region, so an outage or limit may apply to one model in one region while the rest of Bedrock runs normally."
      },
      {
        "question": "Where can I see AWS Bedrock incident history?",
        "answer": "AWS keeps a public event log on the AWS Health Dashboard at health.aws.amazon.com/health/status, where you can browse recent and historical events filtered by service and region. For incidents that hit your own workloads, the personalized AWS Health Dashboard in the console retains your account's event history. Major regional AWS outages are also written up in detailed post-event summaries that AWS publishes after the fact."
      }
    ],
    "failover": [
      {
        "title": "Call the model owner directly",
        "text": "Because Bedrock is a managed gateway in front of other companies' models, the fastest fallback is often the model provider's own API. If you were calling Claude on Bedrock, hit the Claude API directly. If you were calling Mistral, use Mistral's own endpoint. The model behaves the same, you just bypass the AWS layer that is having the event. Keep API keys for one or two model owners ready so you can switch without a code rewrite.",
        "links": [
          {
            "label": "Claude API status",
            "href": "/is-claude-down"
          },
          {
            "label": "Mistral status",
            "href": "/is-mistral-down"
          },
          {
            "label": "Cohere status",
            "href": "/is-cohere-down"
          }
        ]
      },
      {
        "title": "Route through a sibling inference gateway",
        "text": "Other multi-model gateways host overlapping catalogs (Llama, Mistral, Qwen, DeepSeek and more) on separate infrastructure, so a Bedrock event does not touch them. OpenRouter can fail over across providers automatically, while Together AI, Fireworks, and Groq run the open-weight models on their own stacks. Compare current uptime across gateways before you re-point traffic.",
        "links": [
          {
            "label": "OpenRouter status",
            "href": "/is-openrouter-down"
          },
          {
            "label": "Together AI status",
            "href": "/is-together-down"
          },
          {
            "label": "Compare inference providers",
            "href": "/inference-providers"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Skip the manual refreshing. TensorFeed can alert you the moment Bedrock or any tracked AI provider flips between operational, degraded, and down, so you find out before your users do. You can also watch every major provider on one live board to decide where to send traffic during an incident.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI provider status",
            "href": "/status"
          }
        ]
      }
    ]
  },
  "azure-openai": {
    "slug": "azure-openai",
    "displayName": "Azure OpenAI",
    "statusServiceName": "Azure OpenAI",
    "providerName": "Microsoft Azure",
    "providerUrl": "https://azure.microsoft.com/products/ai-services/openai-service",
    "statusPageUrl": "https://azure.status.microsoft/en-us/status",
    "metaTitle": "Is Azure OpenAI Down? Live Azure OpenAI API Status",
    "metaDescription": "Check if Azure OpenAI is down right now. Live status for the Azure OpenAI Service (GPT, o-series, embeddings) pulled from Microsoft's Azure status feed every 2 minutes.",
    "serviceDescription": "Azure OpenAI Service (now part of Azure AI Foundry) is Microsoft Azure's enterprise-hosted deployment of OpenAI models, including the GPT family, o-series reasoning models, embeddings, and image and audio models. It runs on Azure infrastructure with separate capacity, authentication, and regional endpoints from the public OpenAI API.",
    "faqs": [
      {
        "question": "Is Azure OpenAI down right now?",
        "answer": "The live indicator at the top of this page is the answer. Green means the Azure status feed has no active items matching Azure OpenAI, Cognitive Services, or AI Foundry. Amber means Microsoft has published a degradation in at least one region, and red means a major service disruption. Because Azure OpenAI is deployed per region, a red or amber state often means a subset of regions is affected, not the whole service, so read the active items list for the regions and surfaces that are actually impacted."
      },
      {
        "question": "How do I check Azure OpenAI status?",
        "answer": "Three places. This page filters Microsoft's public Azure status feed (azure.status.microsoft) every two minutes for items mentioning Azure OpenAI so you skip the hundreds of unrelated Azure components. For incidents scoped to your own subscription and regions, open Azure Service Health in the Azure portal, which shows issues that the public page sometimes does not. You can also watch your deployment's own latency and 429 or 5xx error rates, which frequently move before any status item posts."
      },
      {
        "question": "What should I do when Azure OpenAI is down?",
        "answer": "Most Azure OpenAI outages are regional, so the fastest fix is to fail over to another region where you have a deployment, which is the recommended multi-region pattern. If the disruption is broad, route to a different provider such as the public OpenAI API or Anthropic's Claude API, since their capacity is provisioned separately from Azure. If you are seeing 429 throttling rather than an outage, that is a quota or rate-limit issue on your deployment, not a Microsoft incident, and you may need a Provisioned Throughput (PTU) deployment or a quota increase."
      },
      {
        "question": "How often does Azure OpenAI go down, and how reliable is it?",
        "answer": "Azure OpenAI is generally reliable and backed by an enterprise SLA, with most months passing without a customer-facing incident. When problems do happen they tend to be regional capacity or latency events rather than a global hard down, and many users in unaffected regions notice nothing. The most common day-to-day pain is not outages at all but 429 rate-limit responses during demand spikes, which is a quota constraint rather than a Microsoft service failure."
      },
      {
        "question": "Which models and services does Azure OpenAI run, and how is it different from OpenAI direct?",
        "answer": "Azure OpenAI hosts OpenAI's GPT family, the o-series reasoning models, text embeddings, and image and audio models like DALL-E and Whisper, with newer and third-party models increasingly offered through Azure AI Foundry. The key difference from OpenAI direct is that it is a separate product: separate endpoints (your-resource.openai.azure.com), separate Azure AD or key authentication, separate per-region capacity, and its own deployment types (Standard, Global Standard, Data Zone, and Provisioned). An OpenAI direct outage does not necessarily affect Azure OpenAI, and vice versa, because they do not share the same front-end capacity."
      },
      {
        "question": "Where can I see Azure OpenAI incident history?",
        "answer": "Microsoft publishes recent and resolved incidents at azure.status.microsoft, and the Azure portal's Service Health blade keeps a personalized history plus post-incident Root Cause Analysis (RCA) documents for issues that affected your subscription. The public status page only shows currently active items, so for past incidents the Service Health history view in the portal is the authoritative record."
      }
    ],
    "failover": [
      {
        "title": "Fail over to another region or a comparable frontier API",
        "text": "Azure OpenAI is deployed per region, so your first move during an outage is to route traffic to a different region where you already have a deployment. If the disruption is broad or you have no spare region, switch to a comparable frontier API. The public OpenAI API runs the same model families on separate capacity, and Anthropic's Claude API is a strong drop-in for chat and reasoning workloads. Both are provisioned independently from Azure.",
        "links": [
          {
            "label": "Is ChatGPT (OpenAI) down?",
            "href": "/is-chatgpt-down"
          },
          {
            "label": "Is Claude down?",
            "href": "/is-claude-down"
          },
          {
            "label": "Is Gemini down?",
            "href": "/is-gemini-down"
          }
        ]
      },
      {
        "title": "Route through a multi-provider gateway",
        "text": "If you do not want to hard-code a single backup, send requests through an inference gateway that can fail over across providers automatically. OpenRouter exposes hundreds of models behind one OpenAI-compatible endpoint, and gateways like Groq, Together, and Fireworks serve open-weight models on independent infrastructure so an Azure incident does not take your app down with it.",
        "links": [
          {
            "label": "Is OpenRouter down?",
            "href": "/is-openrouter-down"
          },
          {
            "label": "Compare inference providers",
            "href": "/inference-providers"
          },
          {
            "label": "OpenRouter model list (API)",
            "href": "/api/openrouter/models"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Rather than refreshing this page during an incident, set an alert so you hear the moment Azure OpenAI flips back to operational (or goes down again). TensorFeed alerts watch the same feed and probes that drive this page, and the full status board shows every major AI provider side by side so you can pick a healthy fallback fast.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI provider status",
            "href": "/status"
          }
        ]
      }
    ]
  },
  "deepseek": {
    "slug": "deepseek",
    "displayName": "DeepSeek",
    "statusServiceName": "DeepSeek",
    "providerName": "DeepSeek",
    "providerUrl": "https://www.deepseek.com",
    "statusPageUrl": "https://status.deepseek.com",
    "metaTitle": "Is DeepSeek Down? Live DeepSeek API Status",
    "metaDescription": "Is DeepSeek down right now? Live status for the DeepSeek API (api.deepseek.com) and web chat, covering DeepSeek-V3.x and R1, with outage history and fallbacks.",
    "serviceDescription": "DeepSeek is an AI lab that builds the DeepSeek-V3 series of general models and the DeepSeek-R1 reasoning models, served through the OpenAI-compatible api.deepseek.com endpoint, a web chat at chat.deepseek.com, and mobile apps.",
    "faqs": [
      {
        "question": "Is DeepSeek down right now?",
        "answer": "The live indicator at the top of this page is the answer. A green dot means the DeepSeek API and web chat are operational, amber means degraded (slower responses, intermittent timeouts, or rate-limit errors), and red means a confirmed outage. We refresh the reading from DeepSeek's official status feed every couple of minutes, so trust the colored badge over any cached impression you have from a few minutes ago."
      },
      {
        "question": "How do I check DeepSeek status?",
        "answer": "Start with the live badge on this page, which mirrors DeepSeek's official status page at status.deepseek.com. If you want to confirm the failure is on DeepSeek's side and not your own, send a minimal request to api.deepseek.com and watch the HTTP code: a 5xx or a connection timeout points at DeepSeek, while a 401 or 402 points at your API key or account balance. The web chat at chat.deepseek.com and the API can fail independently, so check whichever surface you actually use."
      },
      {
        "question": "What should I do when DeepSeek is down?",
        "answer": "Because DeepSeek publishes open weights, you are not locked to api.deepseek.com. The fastest fallback is to point the same model name at a third-party host that serves DeepSeek-V3 or R1, such as Together AI, Fireworks AI, or OpenRouter, since their inference runs on separate infrastructure. If you just need a working reasoning or chat model and do not care that it is DeepSeek specifically, route to Claude, GPT, or Gemini instead. Add retry with backoff so transient 5xx errors recover on their own."
      },
      {
        "question": "How often does DeepSeek go down, and how reliable is it?",
        "answer": "DeepSeek's API is generally stable during normal load, but it has a track record of capacity strain during demand spikes. After its models went viral the platform saw stretches of degraded performance, slow first-token latency, intermittent server-busy errors, and temporary pauses on new signups. Treat short degraded windows under heavy load as the most likely failure mode rather than full hard outages. We avoid quoting a specific uptime percentage because DeepSeek does not publish a contractual SLA for the standard API."
      },
      {
        "question": "Which DeepSeek models and services does this page cover?",
        "answer": "This page tracks the first-party DeepSeek platform: the api.deepseek.com endpoint serving the DeepSeek-V3 series (deepseek-chat) and the DeepSeek-R1 reasoning line (deepseek-reasoner), plus the web chat and mobile apps. A common point of confusion is that many people run DeepSeek models through other providers; if you access DeepSeek-V3 or R1 via Together, Fireworks, OpenRouter, or a self-hosted copy of the open weights, an outage there is unrelated to this status. Note that DeepSeek's primary infrastructure is hosted in China, which can add latency for distant regions even when the service is fully up."
      },
      {
        "question": "Where can I see DeepSeek incident history?",
        "answer": "DeepSeek's official status page at status.deepseek.com keeps a running log of past incidents and maintenance windows, which is the authoritative record of what broke and when. For a cross-provider view, TensorFeed's status dashboard tracks DeepSeek alongside every other major AI API so you can tell a DeepSeek-only incident apart from a broader internet or upstream event. You can also subscribe to change alerts so you are notified the moment the status flips."
      }
    ],
    "failover": [
      {
        "title": "Switch to another host for the same DeepSeek model",
        "text": "DeepSeek-V3 and R1 are open-weight models, so multiple gateways serve them on infrastructure that has nothing to do with api.deepseek.com. If first-party DeepSeek is down or throttled, repoint your client to Together AI, Fireworks AI, or OpenRouter and keep the same model. OpenRouter is especially handy because it can route across several DeepSeek hosts automatically, so one provider's outage does not stop your requests.",
        "links": [
          {
            "label": "Is Together AI down?",
            "href": "/is-together-down"
          },
          {
            "label": "Is Fireworks down?",
            "href": "/is-fireworks-down"
          },
          {
            "label": "Is OpenRouter down?",
            "href": "/is-openrouter-down"
          }
        ]
      },
      {
        "title": "Fall back to a comparable frontier API",
        "text": "If you just need a reliable reasoning or chat model and DeepSeek specifically is not a hard requirement, route to a comparable hosted API. Claude, GPT, and Gemini all cover general chat and reasoning workloads and run on entirely separate infrastructure, so a DeepSeek outage will not take them down with it. Keep an adapter layer so swapping the base URL and model name is a one-line change.",
        "links": [
          {
            "label": "Is Claude down?",
            "href": "/is-claude-down"
          },
          {
            "label": "Is ChatGPT down?",
            "href": "/is-chatgpt-down"
          },
          {
            "label": "Is Gemini down?",
            "href": "/is-gemini-down"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Instead of refreshing this page during an incident, subscribe to alerts and let TensorFeed tell you the moment DeepSeek flips between operational, degraded, and down. You can watch every major AI provider from one dashboard, which makes it easy to confirm whether the problem is DeepSeek alone or a wider outage hitting several APIs at once.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI provider status",
            "href": "/status"
          },
          {
            "label": "Compare inference providers",
            "href": "/inference-providers"
          }
        ]
      }
    ]
  },
  "together": {
    "slug": "together",
    "displayName": "Together AI",
    "statusServiceName": "Together AI",
    "providerName": "Together AI",
    "providerUrl": "https://www.together.ai",
    "statusPageUrl": "https://status.together.ai",
    "metaTitle": "Is Together AI Down? Live Together API Status",
    "metaDescription": "Is Together AI down right now? Live status for the Together inference API across Llama, DeepSeek, Qwen, and FLUX, with incident history and fast failover options.",
    "serviceDescription": "Together AI is an inference platform that runs open and open-weight models (Llama, DeepSeek, Qwen, Mistral, Gemma, FLUX image models, plus embeddings, rerank, and voice) behind a single OpenAI-compatible API. It also offers fine-tuning and GPU compute for builders deploying open models in production.",
    "faqs": [
      {
        "question": "Is Together AI down right now?",
        "answer": "The live indicator at the top of this page reflects Together's current state, pulled from its official status page every couple of minutes. A green dot means the inference API is operational, amber means degraded performance (slower responses or intermittent errors on some models), and red means an active outage. If the indicator is green but your own requests are failing, the problem is more likely your API key, rate limits, billing, or a specific model endpoint rather than a platform-wide outage."
      },
      {
        "question": "How do I check Together AI status?",
        "answer": "Together publishes an official status page at status.together.ai (hosted on Better Stack) that shows current uptime and any open incidents. This page mirrors that signal and refreshes automatically, so you do not have to keep reloading the source. For a wider view, tensorfeed.ai/status lists Together alongside every other major AI provider in one place."
      },
      {
        "question": "What should I do when Together AI is down?",
        "answer": "First confirm it is a Together-wide issue and not your key, quota, or one specific model by checking the status indicator here. If Together is genuinely down, the fastest fix is to route the same open model through another host: Fireworks AI and Groq run overlapping catalogs, and OpenRouter can fail over across multiple providers automatically. Add retry logic with backoff so transient blips do not break your app, and subscribe to alerts so you know the moment it recovers."
      },
      {
        "question": "How often does Together AI go down, and how reliable is it?",
        "answer": "Together AI is generally reliable for a high-volume inference platform, with most disruptions being short, partial events (one model family or one capability degrading) rather than full outages. Because it serves a large, frequently changing catalog of open models on shared GPU infrastructure, occasional capacity pressure or per-model incidents are more common than total downtime. Together does not publish a single contractual uptime figure publicly, so treat the live status page and incident history as the authoritative record rather than a fixed SLA number."
      },
      {
        "question": "Which models and services does Together AI run, and what gets confused with it?",
        "answer": "Together hosts a broad open-model catalog including the Llama family, DeepSeek V3 and R1, Qwen, Mistral, and Gemma for chat and reasoning, plus FLUX image generation, embeddings, rerank, and voice endpoints, all behind one OpenAI-compatible API. A common confusion: Together is a host, not the model owner, so the same model accessed through DeepSeek's own API or another provider runs on entirely separate infrastructure and is not affected by a Together outage. Together's fine-tuning jobs and dedicated GPU endpoints are also distinct components that can have issues independent of the shared serverless API."
      },
      {
        "question": "Where can I see Together AI incident history?",
        "answer": "The official status page at status.together.ai keeps a log of past incidents with timestamps, affected components, and resolution notes, which is the best source for confirming whether a recent disruption was on Together's side. If you build on Together, watch that page during any suspected outage to see which specific component (serverless inference, a model family, fine-tuning, or dedicated endpoints) was involved."
      }
    ],
    "failover": [
      {
        "title": "Route the same open model through another host",
        "text": "Together is an inference host, not the model owner, so the same open weights run on other gateways with separate infrastructure. Fireworks AI and Groq carry overlapping catalogs (Llama, DeepSeek, Qwen) on independent stacks, and most expose an OpenAI-compatible endpoint, so switching is often just a base URL and key change. For DeepSeek-heavy workloads, going to DeepSeek's own API bypasses third-party hosts entirely.",
        "links": [
          {
            "label": "Is Fireworks AI down?",
            "href": "/is-fireworks-down"
          },
          {
            "label": "Is Groq down?",
            "href": "/is-groq-down"
          },
          {
            "label": "Is DeepSeek down?",
            "href": "/is-deepseek-down"
          }
        ]
      },
      {
        "title": "Use a router that fails over automatically",
        "text": "OpenRouter sits in front of many providers and can shift traffic to a healthy host when one goes down, which removes the need to hardcode a single backend. If you are choosing where to send open-model inference, compare live provider health and catalogs first so your fallback is not also degraded. The TensorFeed inference providers and open weights views help you pick a backup before you need one.",
        "links": [
          {
            "label": "Is OpenRouter down?",
            "href": "/is-openrouter-down"
          },
          {
            "label": "Inference providers",
            "href": "/inference-providers"
          },
          {
            "label": "Open-weight models",
            "href": "/open-weights"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Instead of refreshing the status page, set an alert so you hear about a Together outage (and recovery) the moment it happens. TensorFeed tracks Together alongside every other major provider, so one place covers your whole stack. Pair this with the full status board to spot whether an issue is isolated to Together or hitting several hosts at once.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI provider status",
            "href": "/status"
          }
        ]
      }
    ]
  },
  "fireworks": {
    "slug": "fireworks",
    "displayName": "Fireworks AI",
    "statusServiceName": "Fireworks AI",
    "providerName": "Fireworks AI",
    "providerUrl": "https://fireworks.ai",
    "statusPageUrl": "https://status.fireworks.ai",
    "metaTitle": "Is Fireworks AI Down? Live Fireworks AI Status",
    "metaDescription": "Is Fireworks AI down right now? Check live Fireworks AI status for the inference API: chat completions, embeddings, image, and voice across the open model catalog.",
    "serviceDescription": "Fireworks AI is a fast inference platform that serves open and open-weight models (DeepSeek, Llama, Qwen, GPT OSS, FLUX, Whisper) plus embeddings through an OpenAI-compatible API, with fine-tuning and dedicated GPU deployments. It runs on the company's FireAttention serving stack tuned for low-latency, high-throughput inference.",
    "faqs": [
      {
        "question": "Is Fireworks AI down right now?",
        "answer": "The live indicator at the top of this page is the answer. If it reads operational, the Fireworks inference API is serving requests normally. Amber means degraded (slower responses or intermittent errors on some models), and red means an active outage. We refresh the signal every couple of minutes against Fireworks's own status data, so read the dot first, then the heading."
      },
      {
        "question": "How do I check Fireworks AI status?",
        "answer": "Fireworks publishes an official status page at https://status.fireworks.ai with component-level and per-model uptime. This page mirrors that signal so you can check Fireworks alongside every other major AI provider in one place. If your own requests are failing but both pages show green, the issue is more likely your API key, billing, rate limits, or a specific model deployment than a platform-wide outage."
      },
      {
        "question": "What should I do when Fireworks AI is down?",
        "answer": "Because Fireworks hosts mostly open and open-weight models, the same model usually runs elsewhere on separate infrastructure. Point your OpenAI-compatible client at a sibling inference host like Together AI or Groq, or use OpenRouter to fail over across providers automatically. Add retry-with-backoff and a fallback base URL in your client so a single provider incident does not take down your app."
      },
      {
        "question": "How often does Fireworks AI go down, and is it reliable?",
        "answer": "Fireworks is a production inference platform used by businesses, and full platform-wide outages are uncommon. The more typical disruptions are partial: a specific model becoming temporarily unavailable, elevated latency under load, or capacity pressure on a popular new model right after launch. Treat per-model availability separately from the overall platform, which is why component-level status pages matter more than a single up or down flag."
      },
      {
        "question": "Which models and services does Fireworks AI run?",
        "answer": "Fireworks serves open and open-weight LLMs (DeepSeek V3 and R1, Llama 3.x, Qwen, OpenAI GPT OSS), vision-language models, FLUX image generation, Whisper speech-to-text, and text embeddings, all through an OpenAI-compatible API. It also offers fine-tuning, function calling, structured JSON output, and dedicated GPU deployments. Note: Fireworks AI (fireworks.ai, the inference company) is unrelated to Fireworks the design tool or any consumer app of the same name."
      },
      {
        "question": "Where can I see Fireworks AI incident history?",
        "answer": "The official status page at https://status.fireworks.ai keeps a log of past incidents and maintenance windows with timestamps and resolution notes, which is the authoritative record. For real-time alerts plus cross-provider context (so you can tell a Fireworks-only incident from a broader upstream model issue), use this page and TensorFeed's status hub, which tracks Fireworks next to its sibling inference gateways."
      }
    ],
    "failover": [
      {
        "title": "Switch to a sibling inference gateway",
        "text": "Fireworks runs open and open-weight models, so the same checkpoint almost always exists on another host with separate infrastructure. Together AI and Groq both serve overlapping catalogs (DeepSeek, Llama, Qwen) through OpenAI-compatible APIs, so failover is often just a base-URL and key swap. Compare options on TensorFeed's inference providers list.",
        "links": [
          {
            "label": "Is Together AI down?",
            "href": "/is-together-down"
          },
          {
            "label": "Is Groq down?",
            "href": "/is-groq-down"
          },
          {
            "label": "Inference providers",
            "href": "/inference-providers"
          }
        ]
      },
      {
        "title": "Route across providers automatically",
        "text": "If you do not want to manage one fallback host yourself, OpenRouter sits in front of many providers and can route a single model request to whichever backend is healthy, which absorbs a Fireworks-only incident without code changes. HuggingFace Inference is another route to many of the same open-weight models when you need a different path entirely.",
        "links": [
          {
            "label": "Is OpenRouter down?",
            "href": "/is-openrouter-down"
          },
          {
            "label": "Is HuggingFace down?",
            "href": "/is-huggingface-down"
          },
          {
            "label": "Browse OpenRouter models",
            "href": "/api/openrouter/models"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Instead of refreshing a status page during an incident, subscribe to alerts and get pinged the moment Fireworks flips to degraded or down (and again when it recovers). You can also watch the full multi-provider board to see whether the problem is Fireworks alone or a broader upstream model outage hitting several gateways at once.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI provider status",
            "href": "/status"
          }
        ]
      }
    ]
  },
  "openrouter": {
    "slug": "openrouter",
    "displayName": "OpenRouter",
    "statusServiceName": "OpenRouter",
    "providerName": "OpenRouter",
    "providerUrl": "https://openrouter.ai",
    "statusPageUrl": "https://status.openrouter.ai",
    "metaTitle": "Is OpenRouter Down? Live OpenRouter API Status",
    "metaDescription": "Is OpenRouter down right now? Live OpenRouter API status with auto-refreshing checks, incident history, and quick fallbacks to upstream models when routing fails.",
    "serviceDescription": "OpenRouter is a unified, OpenAI-compatible API that routes a single request across hundreds of language models from dozens of upstream providers, automatically falling back to alternate providers to keep requests flowing. It gives developers one endpoint, one API key, and one billing account for the entire LLM landscape.",
    "faqs": [
      {
        "question": "Is OpenRouter down right now?",
        "answer": "The live indicator at the top of this page shows the current state. A green dot means the OpenRouter routing API is operational, amber means degraded (requests may be slow or some upstream providers are unreachable), and red means a confirmed outage. The signal is pulled from OpenRouter's official status page and refreshes every couple of minutes, so read the dot and the last-checked timestamp rather than guessing from a single failed request."
      },
      {
        "question": "How do I check OpenRouter status?",
        "answer": "Watch the live indicator on this page, which mirrors OpenRouter's official status page at status.openrouter.ai. That page breaks out uptime for the chat completions API, the models and data APIs, and the website separately, so you can tell whether the routing layer itself is failing or just one component. If your own requests fail but every indicator is green, the problem is more likely your API key, credit balance, or a single upstream provider."
      },
      {
        "question": "What should I do when OpenRouter is down?",
        "answer": "Because OpenRouter is only a routing layer, the upstream providers behind it are usually still online when OpenRouter itself fails. The fastest fix is to point your client directly at the model owner's native API (Anthropic, OpenAI, Google, DeepSeek, and others) since most are compatible with the same OpenAI-style request format you already use. If you need to keep aggregator convenience, sibling gateways like Together or Fireworks host overlapping catalogs on independent infrastructure."
      },
      {
        "question": "How often does OpenRouter go down?",
        "answer": "OpenRouter is generally reliable, and because it can fail over across multiple upstream providers, a single provider outage often does not surface as downtime for you at all. The incidents that do affect everyone tend to be problems with OpenRouter's own routing, auth, or billing layer rather than the models. Brief degraded windows (slower routing, one or two unreachable upstreams) are more common than full outages. Check the official status history for the real track record rather than relying on anecdotes."
      },
      {
        "question": "Which models and providers does OpenRouter cover, and what is the common confusion?",
        "answer": "OpenRouter aggregates hundreds of models, including Anthropic Claude, OpenAI GPT, Google Gemini, Meta Llama, DeepSeek, Mistral, Qwen, and many open-weight options, all behind one OpenAI-compatible endpoint and one API key. The most common confusion is blaming OpenRouter for an error that actually originates upstream: if a specific model fails while everything else works, the issue is usually that model's underlying provider, not OpenRouter's routing. OpenRouter also exposes a free model tier and per-model pricing, so some failures are simply rate limits or credit issues, not outages."
      },
      {
        "question": "Where can I see OpenRouter incident history?",
        "answer": "OpenRouter's official status page at status.openrouter.ai keeps a running log of past incidents with timestamps, affected components, and resolution notes. For a broader view across the whole stack, TensorFeed tracks OpenRouter alongside every major upstream provider so you can correlate an OpenRouter blip with the model vendor that likely caused it. Subscribe to alerts to get notified the moment the status changes instead of refreshing manually."
      }
    ],
    "failover": [
      {
        "title": "Call the upstream provider directly",
        "text": "OpenRouter sits in front of the real model owners, so when the routing layer is down the providers themselves are usually fine. Point your client at the native API for the model you need (Claude, GPT, Gemini, DeepSeek, and friends), since most accept the same OpenAI-style requests you already send. Check each provider's live status first so you switch to one that is actually up.",
        "links": [
          {
            "label": "Is Claude down?",
            "href": "/is-claude-down"
          },
          {
            "label": "Is ChatGPT (OpenAI) down?",
            "href": "/is-chatgpt-down"
          },
          {
            "label": "Is Gemini down?",
            "href": "/is-gemini-down"
          }
        ]
      },
      {
        "title": "Switch to a sibling inference gateway",
        "text": "If you want to keep the convenience of one endpoint and one key, other aggregators host overlapping catalogs on completely separate infrastructure. Together and Fireworks both serve large open-weight and frontier-adjacent model lineups, and Groq is a fast option for the open models it carries. Compare live status and pick whichever is green right now.",
        "links": [
          {
            "label": "Is Together down?",
            "href": "/is-together-down"
          },
          {
            "label": "Is Fireworks down?",
            "href": "/is-fireworks-down"
          },
          {
            "label": "Is Groq down?",
            "href": "/is-groq-down"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Instead of refreshing this page, subscribe to TensorFeed alerts and get pinged the moment OpenRouter (or any upstream provider it routes to) flips between operational, degraded, and down. Pair it with the live status board and the provider leaderboard to pick the most reliable route at any moment.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "Live status board",
            "href": "/status"
          },
          {
            "label": "Provider uptime leaderboard",
            "href": "/leaderboard"
          }
        ]
      }
    ]
  },
  "perplexity": {
    "slug": "perplexity",
    "displayName": "Perplexity",
    "statusServiceName": "Perplexity",
    "providerName": "Perplexity AI",
    "providerUrl": "https://www.perplexity.ai",
    "statusPageUrl": "https://status.perplexity.com",
    "metaTitle": "Is Perplexity Down? Live Perplexity Status",
    "metaDescription": "Check if Perplexity is down right now. Live status for the Perplexity answer engine and Sonar API, with the official status.perplexity.com indicator and fallbacks.",
    "serviceDescription": "Perplexity (Perplexity AI) is an AI answer engine that searches the web and returns cited, conversational answers, with a developer-facing Sonar API for grounded, search-backed responses. It offers free and Pro tiers plus the Sonar API for building search-grounded applications.",
    "faqs": [
      {
        "question": "Is Perplexity down right now?",
        "answer": "The live indicator near the top of this page reflects the current state. A green operational badge means the Perplexity answer engine and Sonar API are responding normally. An amber degraded badge usually means answers are slow or some searches are failing intermittently, and a red badge means a wider outage. We read the official status.perplexity.com feed, so the badge here mirrors what Perplexity itself reports."
      },
      {
        "question": "How do I check Perplexity status?",
        "answer": "This page pulls the official Perplexity status feed from status.perplexity.com and refreshes automatically, so it is the fastest single place to read it. You can also visit status.perplexity.com directly for the full component breakdown, or watch user reports on social platforms when you suspect a wider problem. If only your account or one query is failing while the status page is green, it is more likely a local or account-specific issue than a Perplexity outage."
      },
      {
        "question": "What should I do when Perplexity is down?",
        "answer": "First confirm whether it is the web answer engine, the mobile app, or the Sonar API that is affected, since they can fail independently. For everyday research and answers, a general assistant like ChatGPT, Claude, or Gemini can fill the gap, though they do not all search the live web the same way. If you are building on the Sonar API, queue or retry requests with backoff and have a fallback model path ready so your app degrades gracefully rather than erroring out."
      },
      {
        "question": "How often does Perplexity go down?",
        "answer": "Perplexity is generally reliable, and most disruptions are short-lived periods of slowness or partial degradation rather than full outages. Like any service that depends on live web search and multiple upstream model providers, it can have brief incidents when search infrastructure, a model backend, or a traffic spike causes hiccups. Treat a single failed query as noise; only repeated failures across queries or a red status badge point to a real incident."
      },
      {
        "question": "Which models and services does Perplexity run?",
        "answer": "Perplexity runs its own Sonar family of search-grounded models and also routes to frontier models from other providers (such as GPT, Claude, and Gemini class models) depending on your tier and the mode you pick. Because of this, a Perplexity slowdown can sometimes trace back to an upstream provider rather than Perplexity itself, so it is worth checking the relevant model provider's status too. The Sonar API is the developer product; the consumer answer engine, Pro tier, and any browser or app surfaces are separate components that can be affected on their own."
      },
      {
        "question": "Where can I see Perplexity incident history?",
        "answer": "The official status.perplexity.com page keeps a running incident log with timestamps, affected components, and post-incident updates, which is the authoritative record. This TensorFeed page reflects the current state from that same feed. For broader context across the whole AI ecosystem, our /status dashboard tracks Perplexity alongside other major providers so you can see whether an issue is isolated or part of a wider event."
      }
    ],
    "failover": [
      {
        "title": "Switch to another answer engine or assistant",
        "text": "If the Perplexity answer engine is unavailable, a general-purpose assistant can usually cover research and Q and A in the meantime. ChatGPT, Claude, and Gemini all handle conversational answers, though their live-web behavior differs from Perplexity's cited search. Pick whichever you already have access to and confirm it is healthy before relying on it.",
        "links": [
          {
            "label": "Is ChatGPT down?",
            "href": "/is-chatgpt-down"
          },
          {
            "label": "Is Claude down?",
            "href": "/is-claude-down"
          },
          {
            "label": "Is Gemini down?",
            "href": "/is-gemini-down"
          }
        ]
      },
      {
        "title": "Have a Sonar API fallback ready",
        "text": "If you build on the Sonar API, an outage there should not take your app down with it. Route to a comparable API as a backup and add retry-with-backoff so transient failures recover on their own. Since Perplexity can route to upstream frontier models, checking those providers' status can also tell you whether the root cause is Perplexity or a backend it depends on.",
        "links": [
          {
            "label": "Is OpenRouter down?",
            "href": "/is-openrouter-down"
          },
          {
            "label": "Is Claude down?",
            "href": "/is-claude-down"
          },
          {
            "label": "Compare inference providers",
            "href": "/inference-providers"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Instead of refreshing the status page, let TensorFeed tell you when Perplexity recovers or when a new incident starts. Set an alert and you will know the moment the indicator flips, across Perplexity and the other providers you depend on.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "Live status dashboard",
            "href": "/status"
          }
        ]
      }
    ]
  },
  "copilot": {
    "slug": "copilot",
    "displayName": "GitHub Copilot",
    "statusServiceName": "GitHub Copilot",
    "providerName": "GitHub",
    "providerUrl": "https://github.com/features/copilot",
    "statusPageUrl": "https://www.githubstatus.com",
    "metaTitle": "Is GitHub Copilot Down? Live Copilot Status",
    "metaDescription": "Is GitHub Copilot down right now? Live status for Copilot code completion and chat in VS Code, JetBrains, and Visual Studio, with outage history and fallbacks.",
    "serviceDescription": "GitHub Copilot is GitHub's AI pair programmer that provides code completion and an in-IDE chat assistant across editors like VS Code, JetBrains IDEs, Visual Studio, and Neovim. It runs on large language models from OpenAI and Anthropic and is monitored through the GitHub Status page.",
    "faqs": [
      {
        "question": "Is GitHub Copilot down right now?",
        "answer": "The live indicator at the top of this page reflects GitHub Copilot's current state, pulled from GitHub Status and refreshed every couple of minutes. A green status means completions and Copilot Chat are operating normally; amber means degraded performance (slower suggestions, intermittent chat errors, or partial feature loss); red means a confirmed outage that GitHub is actively investigating. If you see errors in your editor but the dot here is green, the problem is more likely local: check your network, your editor's Copilot extension, and that you are signed in to GitHub."
      },
      {
        "question": "How do I check if GitHub Copilot is down?",
        "answer": "There are three reliable signals. First, this page, which polls GitHub's official status feed and shows component-level detail. Second, the official GitHub Status page at githubstatus.com, where Copilot is listed as its own component alongside Actions, Pages, and the API. Third, the GitHub Status account on X for incident commentary. Because Copilot depends on GitHub authentication, an outage of the broader GitHub platform can take Copilot down even when the model backends are fine."
      },
      {
        "question": "What do I do when GitHub Copilot is down?",
        "answer": "First confirm it is GitHub's side and not your editor by reloading the window, signing out and back in to GitHub, and checking your internet connection. If the outage is confirmed, switch to a comparable coding assistant such as Claude (via Claude Code or the API) or another model through a cross-provider gateway so your work is not blocked. Brief Copilot interruptions usually clear within minutes, so retrying after a short wait is often enough for completion glitches."
      },
      {
        "question": "How often does GitHub Copilot go down, and how reliable is it?",
        "answer": "GitHub Copilot is generally reliable, with most days passing without any user-visible disruption. When problems do occur they are more often brief degradations (slow or missing completions, transient chat errors) than full outages, and they typically resolve within minutes to an hour. Copilot incidents sometimes coincide with broader GitHub platform incidents or with upstream model-provider issues, since Copilot depends on both GitHub services and third-party LLMs."
      },
      {
        "question": "Which models power GitHub Copilot, and is it the same as Microsoft Copilot?",
        "answer": "GitHub Copilot runs on multiple large language models and lets you pick among them in Copilot Chat, including OpenAI GPT models and Anthropic Claude models, with the exact lineup changing over time as GitHub adds options. It is distinct from Microsoft Copilot (the consumer and Microsoft 365 assistant) and from Azure OpenAI, even though all three sit under the Microsoft umbrella. Because Copilot can route to several providers, an outage at one model vendor may degrade some model choices in Copilot Chat while completions or other models keep working."
      },
      {
        "question": "Where can I see GitHub Copilot incident history?",
        "answer": "GitHub publishes incident history and post-incident summaries at githubstatus.com, where you can browse past Copilot incidents along with the rest of the platform. For a cross-provider view, TensorFeed tracks Copilot alongside other AI services on the main status board so you can compare reliability against tools like Claude, ChatGPT, and Gemini in one place."
      }
    ],
    "failover": [
      {
        "title": "Keep coding with a comparable AI assistant",
        "text": "If Copilot completions and chat are down, the fastest unblock is another model-backed assistant. Claude (via Claude Code or the API) is a strong substitute for in-editor coding work, and ChatGPT covers chat-style explanation and debugging well. Both share the same model families Copilot itself routes to, so the quality gap is small.",
        "links": [
          {
            "label": "Is Claude down?",
            "href": "/is-claude-down"
          },
          {
            "label": "Is ChatGPT down?",
            "href": "/is-chatgpt-down"
          },
          {
            "label": "Compare AI chatbots",
            "href": "/best-ai-chatbots"
          }
        ]
      },
      {
        "title": "Route around the outage with a cross-provider gateway",
        "text": "For API-driven or agent workloads, send requests through a gateway that can fall back across multiple model providers instead of depending on a single backend. OpenRouter exposes a large catalog of models behind one endpoint, and the inference providers directory lists comparable gateways so you can keep building while Copilot's backend recovers.",
        "links": [
          {
            "label": "Is OpenRouter down?",
            "href": "/is-openrouter-down"
          },
          {
            "label": "OpenRouter model catalog",
            "href": "/api/openrouter/models"
          },
          {
            "label": "Inference providers",
            "href": "/inference-providers"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Subscribe to TensorFeed outage alerts to get an email the moment GitHub Copilot (or any tracked AI service) goes degraded or down, and again when it recovers. It is free and needs no account, so you do not have to keep refreshing this page to know when Copilot is back.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI service status",
            "href": "/status"
          }
        ]
      }
    ]
  },
  "huggingface": {
    "slug": "huggingface",
    "displayName": "Hugging Face",
    "statusServiceName": "Hugging Face",
    "providerName": "Hugging Face",
    "providerUrl": "https://huggingface.co",
    "statusPageUrl": "https://status.huggingface.co",
    "metaTitle": "Is Hugging Face Down? Live Hugging Face Status",
    "metaDescription": "Check if Hugging Face is down right now. Live status for the Hub, Inference API and Endpoints, and Spaces, with outage history, component health, and fallbacks.",
    "serviceDescription": "Hugging Face is the open machine learning platform behind the Model and Dataset Hub, the Inference API and dedicated Inference Endpoints, and Spaces for hosting demos and apps. It is where much of the open-weights community ships, downloads, and runs models.",
    "faqs": [
      {
        "question": "Is Hugging Face down right now?",
        "answer": "The live indicator at the top of this page shows the current state. Green means the Hub, Inference, and Spaces are operational, amber means degraded performance (slow model downloads, queued Spaces, or intermittent Inference errors), and red means a confirmed outage. If you see green here but a specific feature is failing for you, it is more likely a model-specific, repo-specific, or local network issue than a platform-wide outage."
      },
      {
        "question": "How do I check if Hugging Face is down?",
        "answer": "Read the live status panel on this page first, which tracks the Hub, Inference, and Spaces together. For the authoritative per-component breakdown, open the official status page at status.huggingface.co, which lists incidents for the website, Hub APIs, Inference, and Spaces separately. You can also confirm scope quickly by trying a `git clone` or `huggingface-cli download` against a public repo; if that fails too, the problem is on Hugging Face's side rather than yours."
      },
      {
        "question": "What should I do when Hugging Face is down?",
        "answer": "First identify which surface is failing, since the Hub, Inference API or Endpoints, and Spaces can fail independently. If only Inference is down, route the same open model through a sibling inference gateway like Together, Fireworks, Groq, or OpenRouter. If model downloads from the Hub are failing, models you already cached locally (in your `~/.cache/huggingface` directory) keep working offline, so set `HF_HUB_OFFLINE=1` to force the cache. For Spaces outages, there is no quick substitute beyond waiting or self-hosting the underlying code."
      },
      {
        "question": "How often does Hugging Face go down, and how reliable is it?",
        "answer": "Hugging Face is generally reliable for a platform of its scale, and full platform-wide outages are uncommon. The more frequent pattern is partial degradation: slow or rate-limited model downloads during heavy traffic, Inference API timeouts or cold-start delays on less-used models, and Spaces that get stuck building or sleeping. Because the free Inference API is a shared, best-effort tier, intermittent slowness there is normal and not the same as the Hub being down."
      },
      {
        "question": "Which services and models does Hugging Face actually run?",
        "answer": "Hugging Face hosts hundreds of thousands of community and vendor model repos rather than running a single flagship model of its own, so a model failing is often the individual repo or a third-party Inference Provider, not Hugging Face itself. The platform has three distinct surfaces people confuse: the Hub (git-based hosting for models and datasets), Inference (the shared serverless API plus paid dedicated Inference Endpoints), and Spaces (hosted Gradio and Streamlit apps). A common point of confusion is that the serverless Inference API and dedicated Endpoints have separate reliability profiles and separate billing."
      },
      {
        "question": "Where can I see Hugging Face incident history?",
        "answer": "The official status page at status.huggingface.co keeps a running incident log with timestamps, affected components, and post-incident updates, which is the best source for past outages. The Hugging Face status account and the company's posts on X also surface major incidents in real time. For broader context on how Hugging Face reliability compares to other AI services over time, this page and TensorFeed's /status dashboard track the picture across providers."
      }
    ],
    "failover": [
      {
        "title": "Route inference through a sibling gateway",
        "text": "If the Hugging Face Inference API or your dedicated Endpoint is failing but you just need to run an open-weights model, the fastest fix is to send the same model to another inference host. Together, Fireworks, Groq, and OpenRouter all serve popular open models like Llama, Mistral, and Qwen with OpenAI-compatible APIs, so swapping the base URL and key is usually a small change. Check that the target gateway is itself healthy before you cut over.",
        "links": [
          {
            "label": "Is Together down?",
            "href": "/is-together-down"
          },
          {
            "label": "Is Fireworks down?",
            "href": "/is-fireworks-down"
          },
          {
            "label": "Is OpenRouter down?",
            "href": "/is-openrouter-down"
          }
        ]
      },
      {
        "title": "Fall back to local cache or another model source",
        "text": "If Hub downloads are failing, models and datasets you already pulled stay available in your local cache, so set HF_HUB_OFFLINE=1 to keep training and inference running without network calls. For new weights, Replicate hosts many of the same open models behind a simple API, and the open-weights tracker shows which models are mirrored where. Confirm the alternative is operational before you depend on it.",
        "links": [
          {
            "label": "Is Replicate down?",
            "href": "/is-replicate-down"
          },
          {
            "label": "Open-weights model tracker",
            "href": "/open-weights"
          },
          {
            "label": "Inference providers",
            "href": "/inference-providers"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Instead of refreshing this page during an incident, subscribe to TensorFeed alerts and get a ping the moment Hugging Face flips between operational, degraded, and down. You can also watch the full multi-provider dashboard to see whether an issue is isolated to Hugging Face or part of a wider outage hitting several AI services at once.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI service status",
            "href": "/status"
          }
        ]
      }
    ]
  },
  "replicate": {
    "slug": "replicate",
    "displayName": "Replicate",
    "statusServiceName": "Replicate",
    "providerName": "Replicate",
    "providerUrl": "https://replicate.com",
    "statusPageUrl": "https://status.replicate.com",
    "metaTitle": "Is Replicate Down? Live Replicate API Status",
    "metaDescription": "Check if Replicate is down right now. Live Replicate status for the hosted model run API (image, video, audio, LLMs), pulled from the official status page.",
    "serviceDescription": "Replicate is a hosted model run platform that lets developers run open and proprietary machine learning models (image, video, audio, and language) through a single API, with models packaged in the open-source Cog format.",
    "faqs": [
      {
        "question": "Is Replicate down right now?",
        "answer": "The live status indicator at the top of this page is the answer. A green operational dot means Replicate's API and model runs are responding normally. An amber dot means degraded performance, such as slow predictions, long queue times, or intermittent errors, and a red dot means an active outage. We refresh that signal against Replicate's own data, so read the dot first, then check the FAQs below if you need next steps."
      },
      {
        "question": "How do I check if Replicate is down?",
        "answer": "Start with the live indicator on this page, which reflects Replicate's official status. For the primary source, open status.replicate.com, where Replicate publishes component-level status and any active incidents. You can also confirm on your end by checking the Replicate dashboard for stuck or failed predictions, and watch for HTTP 5xx responses or unusually long cold-start times from the API."
      },
      {
        "question": "What should I do when Replicate is down?",
        "answer": "First confirm whether the issue is the API, a specific model, or a webhook delay, since a single model can fail while the platform is healthy. Retry with backoff for transient errors and check that your prediction is not just queued behind a cold start. If the outage is platform-wide, route image and video work to comparable hosted model providers or run the open weights you were using on another inference host until Replicate recovers."
      },
      {
        "question": "How often does Replicate go down, and how reliable is it?",
        "answer": "Replicate is generally reliable for a platform that runs thousands of community and first-party models, but it is not immune to incidents. The most common disruptions are not full outages: they are elevated cold-start latency, queue backups during demand spikes, and individual models failing or being deprecated. Treat the official status page as authoritative for actual uptime rather than relying on any single number."
      },
      {
        "question": "Which models and services does Replicate run, and what gets confused for an outage?",
        "answer": "Replicate hosts image models (such as the Flux and SDXL families), video models, audio and speech models, and language models, all packaged in the open-source Cog format and called through one API. A frequent false alarm is a cold start: if a model has not run recently, the first request spins up its container and can take many seconds or longer, which looks like a hang but is expected. Another is a model-specific error or a removed version, which affects only that model and not Replicate as a whole."
      },
      {
        "question": "Where can I see Replicate incident history?",
        "answer": "Replicate's official status page at status.replicate.com keeps a history of past incidents and maintenance, with timestamps and resolution notes. That is the canonical record for postmortems and recurring patterns. For broader context on how Replicate compares to other inference and media providers during the same window, this page and the wider TensorFeed status board track the ecosystem side by side."
      }
    ],
    "failover": [
      {
        "title": "Run the same models on another host",
        "text": "Most Replicate models are open weights wrapped in Cog, so they are not exclusive to Replicate. If the platform is down, you can run comparable image, audio, and language models through sibling inference gateways that host overlapping catalogs, or route across providers automatically so a single outage does not stop your pipeline. Hit the model owner's own API directly when one exists.",
        "links": [
          {
            "label": "Hugging Face status",
            "href": "/is-huggingface-down"
          },
          {
            "label": "Together AI status",
            "href": "/is-together-down"
          },
          {
            "label": "OpenRouter status",
            "href": "/is-openrouter-down"
          }
        ]
      },
      {
        "title": "Switch media generation tools",
        "text": "If you were using Replicate specifically for image, video, or audio generation, comparable hosted media tools can cover the gap. Stability AI serves image models, Runway and Luma cover video, and ElevenLabs handles voice and audio, each on independent infrastructure from Replicate.",
        "links": [
          {
            "label": "Stability AI status",
            "href": "/is-stability-ai-down"
          },
          {
            "label": "Runway status",
            "href": "/is-runway-down"
          },
          {
            "label": "Luma status",
            "href": "/is-luma-down"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Do not sit refreshing this page. Set an alert and get pinged the moment Replicate flips between operational, degraded, and down, so you can fail over before users notice. You can also watch every major AI provider on one board and compare open-weights model availability across hosts.",
        "links": [
          {
            "label": "Set a status alert",
            "href": "/alerts"
          },
          {
            "label": "All AI service status",
            "href": "/status"
          },
          {
            "label": "Inference providers",
            "href": "/inference-providers"
          }
        ]
      }
    ]
  },
  "cohere": {
    "slug": "cohere",
    "displayName": "Cohere",
    "statusServiceName": "Cohere",
    "providerName": "Cohere",
    "providerUrl": "https://cohere.com",
    "statusPageUrl": "https://status.cohere.com",
    "metaTitle": "Is Cohere Down? Live Cohere API Status",
    "metaDescription": "Is Cohere down right now? Live status for the Cohere API covering Command, Embed, and Rerank. See current outages, degraded performance, and incident history.",
    "serviceDescription": "Cohere is an enterprise AI platform that provides large language models and retrieval tooling through an API, including the Command family of generative models, Embed for text embeddings, and Rerank for search relevance.",
    "faqs": [
      {
        "question": "Is Cohere down right now?",
        "answer": "The live indicator at the top of this page reflects Cohere's current state, pulled from monitoring and the official Cohere status page. A green dot means the API is operational, amber means degraded performance (slower responses or intermittent errors), and red means a confirmed outage. If you see green here but your own requests are failing, the problem is more likely your API key, your rate limit, or a specific endpoint than a platform wide outage."
      },
      {
        "question": "How do I check if Cohere is down?",
        "answer": "Start with the live indicator on this page, then confirm against Cohere's official status page at status.cohere.com, which breaks status out by component such as the Chat (Command) API, Embed, and Rerank. From your own side, check the HTTP status code your client returns: a 401 or 403 points to authentication, a 429 means you hit a rate limit or quota, and 500 or 503 codes suggest a server side problem on Cohere's end."
      },
      {
        "question": "What do I do when Cohere is down?",
        "answer": "First confirm it is Cohere and not your key or quota by checking the returned status code and Cohere's status page. If it is a real outage, add retry logic with exponential backoff for transient 5xx errors, since most incidents resolve in minutes. For longer outages, route to a fallback provider: if you are using Command for generation you can swap to Claude or GPT, and for Embed or Rerank you can fall back to another embeddings or reranking provider while you wait."
      },
      {
        "question": "How often does Cohere go down, and how reliable is it?",
        "answer": "Cohere is an enterprise focused provider and is generally stable, with most disruptions being short lived degraded performance rather than full outages. Incidents do happen, typically tied to elevated latency, a specific model or endpoint, or upstream cloud issues. Cohere publishes incident history and component uptime on its status page, which is the most accurate source for actual reliability over time rather than any single number quoted elsewhere."
      },
      {
        "question": "Which Cohere services and models could be affected during an outage?",
        "answer": "Cohere's API spans several distinct products that can fail independently: the Command family for chat and generation, Embed for turning text into vectors, and Rerank for reordering search results by relevance. An incident may hit only one of these, so a Rerank slowdown does not necessarily mean Embed or Command are affected. Cohere is also offered through cloud marketplaces such as Amazon Bedrock, Microsoft Azure, and Oracle Cloud, and on those platforms availability can depend on the cloud provider's own status as well as Cohere's."
      },
      {
        "question": "Where can I see Cohere's incident history?",
        "answer": "Cohere's official status page at status.cohere.com lists past incidents, maintenance windows, and per component uptime, which is the canonical record. For broader context across the AI ecosystem, TensorFeed tracks Cohere alongside other providers so you can see whether an issue is isolated to Cohere or part of a wider pattern affecting multiple APIs at once."
      }
    ],
    "failover": [
      {
        "title": "Swap Command for another generation API",
        "text": "If you call Cohere's Command models for chat or text generation, a comparable frontier API can cover you during an outage. Claude and GPT both handle instruction following, summarization, and tool use, and most SDKs let you switch the base model behind a single config flag. Check that the alternative is itself healthy before you cut over.",
        "links": [
          {
            "label": "Is Claude down?",
            "href": "/is-claude-down"
          },
          {
            "label": "Is ChatGPT down?",
            "href": "/is-chatgpt-down"
          },
          {
            "label": "Is Mistral down?",
            "href": "/is-mistral-down"
          }
        ]
      },
      {
        "title": "Reach Cohere models through a gateway or pick an alternate for Embed and Rerank",
        "text": "Cohere's Command and Embed models are also served through multi provider gateways, so routing through one can sidestep a direct API problem or give you instant fallback to a different model. For embeddings and reranking specifically, open weight and hosted alternatives on inference platforms can stand in until Cohere recovers.",
        "links": [
          {
            "label": "Is OpenRouter down?",
            "href": "/is-openrouter-down"
          },
          {
            "label": "Is Together down?",
            "href": "/is-together-down"
          },
          {
            "label": "Browse inference providers",
            "href": "/inference-providers"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Rather than refreshing this page, set up alerts so you hear the moment Cohere's status flips to degraded or down, and again when it recovers. TensorFeed can also notify you across the other AI providers you depend on, so a single outage does not catch your whole stack by surprise.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI service status",
            "href": "/status"
          }
        ]
      }
    ]
  },
  "mistral": {
    "slug": "mistral",
    "displayName": "Mistral",
    "statusServiceName": "Mistral",
    "providerName": "Mistral AI",
    "providerUrl": "https://mistral.ai",
    "statusPageUrl": "https://status.mistral.ai",
    "metaTitle": "Is Mistral Down? Live Mistral AI API Status",
    "metaDescription": "Is Mistral down right now? Live status for Mistral AI and La Plateforme (Mistral Large, Medium, Small, Codestral), with the official status page, outages, and fallbacks.",
    "serviceDescription": "Mistral AI is a Paris-based frontier lab whose La Plateforme API serves open-weight and commercial models including Mistral Large, Mistral Medium, Mistral Small, and the Codestral code model, along with the Le Chat assistant. Developers reach these models over the api.mistral.ai inference endpoint.",
    "faqs": [
      {
        "question": "Is Mistral down right now?",
        "answer": "The live indicator at the top of this page is the answer to that question. A green dot means La Plateforme and the Mistral API are operational, amber means degraded performance (slower responses or intermittent errors), and red means a confirmed outage. We refresh against Mistral's official status feed every couple of minutes, so trust the colored status badge above over a single failed request, which can be a local network or rate-limit issue rather than a true Mistral outage."
      },
      {
        "question": "How do I check if Mistral is down?",
        "answer": "Start with the live badge on this page, which mirrors Mistral's official status page at status.mistral.ai. If the badge is green but your own calls are failing, confirm your API key and account quota first, then check whether the failure is isolated to one model or region. For a side-by-side view of Mistral against every other major AI provider, open the TensorFeed status board."
      },
      {
        "question": "What should I do when Mistral is down?",
        "answer": "If you call Mistral models through a gateway like OpenRouter or a host that mirrors open-weight Mistral models, you can often reroute to a different backend while api.mistral.ai recovers. If you need a comparable frontier API, Claude, GPT, and Gemini are the closest substitutes for general chat and reasoning, and for code generation Codestral users can fall back to a general model with strong coding ability. Build retries with backoff so a brief blip does not break your app."
      },
      {
        "question": "How often does Mistral go down, and how reliable is it?",
        "answer": "Mistral runs a public status page and generally posts strong uptime for La Plateforme, with the most common disruptions being short windows of degraded performance or elevated latency rather than full outages. Incidents tend to be model-specific or capacity-related during traffic spikes. Reliability for any single AI API also depends on your region and the specific model you call, so a problem with one model does not always mean the whole platform is down."
      },
      {
        "question": "Which Mistral models and services does this page cover?",
        "answer": "This tracker covers Mistral AI's hosted platform: the La Plateforme API at api.mistral.ai serving Mistral Large, Mistral Medium, Mistral Small, the Codestral code model, plus embeddings and the Le Chat assistant. Note that Mistral models are also offered through third parties such as AWS Bedrock, Azure AI Foundry, and various inference gateways. If you reach Mistral through one of those, an outage there is separate from Mistral's own platform and you should check that provider too."
      },
      {
        "question": "Where can I see Mistral's incident history?",
        "answer": "Mistral's official status page at status.mistral.ai keeps a public log of past incidents, maintenance windows, and component-level history. That is the authoritative record for postmortems and recurring issues. This page focuses on the current live state and points you there for the full timeline."
      }
    ],
    "failover": [
      {
        "title": "Switch to a comparable frontier API",
        "text": "If La Plateforme is down and you need general chat or reasoning, the closest substitutes for Mistral Large and Medium are Claude, GPT, and Gemini. Check that each one is healthy before you cut over so you are not trading one outage for another.",
        "links": [
          {
            "label": "Is Claude down?",
            "href": "/is-claude-down"
          },
          {
            "label": "Is ChatGPT down?",
            "href": "/is-chatgpt-down"
          },
          {
            "label": "Is Gemini down?",
            "href": "/is-gemini-down"
          }
        ]
      },
      {
        "title": "Reroute through a gateway or open-weight host",
        "text": "Several open-weight Mistral models run on independent infrastructure outside api.mistral.ai. A gateway like OpenRouter can route around a Mistral platform outage, and hosts such as Together AI and Fireworks serve open Mistral checkpoints on their own stacks. Confirm the gateway itself is healthy first.",
        "links": [
          {
            "label": "Is OpenRouter down?",
            "href": "/is-openrouter-down"
          },
          {
            "label": "Is Together AI down?",
            "href": "/is-together-down"
          },
          {
            "label": "Is Fireworks down?",
            "href": "/is-fireworks-down"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Rather than refreshing this page, set up alerts so you hear the moment Mistral flips between operational, degraded, and down. You can also keep the full multi-provider status board open to watch every AI service at once.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI service status",
            "href": "/status"
          }
        ]
      }
    ]
  },
  "elevenlabs": {
    "slug": "elevenlabs",
    "displayName": "ElevenLabs",
    "statusServiceName": "ElevenLabs",
    "providerName": "ElevenLabs",
    "providerUrl": "https://elevenlabs.io",
    "statusPageUrl": "https://status.elevenlabs.io",
    "metaTitle": "Is ElevenLabs Down? Live ElevenLabs API Status",
    "metaDescription": "Check if ElevenLabs is down right now. Live ElevenLabs status for Text to Speech, Speech to Text, Conversational AI, dubbing, and Telephony, with incident history and fallbacks.",
    "serviceDescription": "ElevenLabs is a voice AI platform offering Text to Speech, Speech to Text, conversational AI agents, dubbing, and voice cloning through an API and web app. It is widely used for synthetic voiceover, audiobooks, agent voices, and multilingual localization.",
    "faqs": [
      {
        "question": "Is ElevenLabs down right now?",
        "answer": "The live indicator at the top of this page shows the current state. A green dot means the API and app are operational, amber means degraded performance (slower generations or partial failures), and red means a confirmed outage. ElevenLabs runs several independent components, so check the per-component breakdown: Text to Speech can be up while Conversational AI or Telephony is having trouble."
      },
      {
        "question": "How do I check ElevenLabs status?",
        "answer": "This page reads the official ElevenLabs status page at status.elevenlabs.io, which publishes per-component health for Text to Speech, Speech to Text, Conversations, Telephony, RAG, and the dashboard UI. We refresh it on a short interval so you see the same signal ElevenLabs publishes. For your own integration, watch HTTP 5xx and 429 rates and elevated latency on the api.elevenlabs.io endpoints you call."
      },
      {
        "question": "What should I do when ElevenLabs is down?",
        "answer": "First confirm whether it is the full API or one component (TTS, STT, or Conversational AI) by checking the breakdown above. If only one feature is affected, route just that workload to a fallback and leave the rest on ElevenLabs. For generation jobs that are not time critical, queue with retries and exponential backoff rather than failing hard, since most ElevenLabs incidents resolve within minutes to an hour. For live agent voices, have a secondary TTS provider wired in so calls do not drop."
      },
      {
        "question": "How often does ElevenLabs go down, and how reliable is it?",
        "answer": "ElevenLabs is generally reliable for a fast-moving voice platform, but it does post incidents on its status page, usually short windows of degraded latency or elevated error rates rather than long total outages. Issues more often hit a single surface (Conversational AI, Telephony, or a specific model) than the entire API. Reliability also depends on the model and feature you use, since newer features tend to see more variance than the core TTS endpoints."
      },
      {
        "question": "Which ElevenLabs models and services exist, and what is commonly confused?",
        "answer": "ElevenLabs spans Text to Speech (Multilingual, Turbo, and Flash voice models), Speech to Text (Scribe), Conversational AI agents, dubbing, voice cloning, sound effects, and Telephony for phone integrations. A common confusion: a failure in Conversational AI or Telephony is not the same as the core TTS API being down, and quota or character-limit errors (HTTP 401 or 429) are account or billing issues, not platform outages. The status page separates these so you can tell a real incident from a key or quota problem."
      },
      {
        "question": "Where can I see ElevenLabs incident history?",
        "answer": "The official status page at status.elevenlabs.io keeps a running incident log with timestamps, affected components, and post-incident updates, so you can see how recent and how long past outages were. This page surfaces the current state; for the full historical timeline and root-cause notes, the ElevenLabs status page is the authoritative source. You can also follow ElevenLabs on their developer channels for real-time incident commentary."
      }
    ],
    "failover": [
      {
        "title": "Switch your voice and transcription workload",
        "text": "If Text to Speech is down, you can route generation to another voice or media provider while ElevenLabs recovers. If Speech to Text (Scribe) is the affected component, point transcription jobs at an alternative model endpoint. For self-hosted or open voice models, an inference gateway can serve a fallback voice model without rewriting your stack. Keep the provider abstracted behind one interface so swapping takes a config change, not a deploy.",
        "links": [
          {
            "label": "Replicate status",
            "href": "/is-replicate-down"
          },
          {
            "label": "Hugging Face status",
            "href": "/is-huggingface-down"
          },
          {
            "label": "Compare inference providers",
            "href": "/inference-providers"
          }
        ]
      },
      {
        "title": "Check sibling media and gateway providers",
        "text": "ElevenLabs sits alongside other generative media and inference services that can absorb spillover. If you also run image, video, or text generation in the same pipeline, confirm those are healthy before you blame ElevenLabs, since a shared outage upstream can look like a voice failure. The TensorFeed status board shows every tracked AI service at once, so you can spot whether the problem is isolated to ElevenLabs or part of a wider event.",
        "links": [
          {
            "label": "Stability AI status",
            "href": "/is-stability-ai-down"
          },
          {
            "label": "Runway status",
            "href": "/is-runway-down"
          },
          {
            "label": "All AI service status",
            "href": "/status"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Instead of refreshing this page, subscribe to status alerts so you hear the moment ElevenLabs flips to degraded or down and the moment it recovers. That lets you trigger your failover automatically and switch back once the core API is healthy again, which matters most for live agent voices and Telephony where dropped calls are costly.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          }
        ]
      }
    ]
  },
  "stability-ai": {
    "slug": "stability-ai",
    "displayName": "Stability AI",
    "statusServiceName": "Stability AI",
    "providerName": "Stability AI",
    "providerUrl": "https://stability.ai",
    "statusPageUrl": "https://status.stability.ai",
    "metaTitle": "Is Stability AI Down? Live Stable Diffusion Status",
    "metaDescription": "Is Stability AI down right now? Live status for the Stability platform API, Stable Diffusion, SDXL, Stable Image, and Stable Audio, pulled from the official status page.",
    "serviceDescription": "Stability AI is the company behind Stable Diffusion, SDXL, the Stable Image family, and Stable Audio. Its platform API at platform.stability.ai serves text-to-image, image editing, and audio generation, while the underlying open-weight models also run on many third-party inference providers.",
    "faqs": [
      {
        "question": "Is Stability AI down right now?",
        "answer": "The live indicator at the top of this page shows the current state. Green means the Stability platform API is operational, amber means degraded (generation requests are slower or queueing), and red means an outage where requests are failing. We pull this directly from Stability AI's official status page, so it reflects what Stability itself is reporting, not just our own probe."
      },
      {
        "question": "How do I check Stability AI status?",
        "answer": "Stability AI publishes its own status page at status.stability.ai, which is the authoritative source for platform incidents. This page mirrors that feed and refreshes every couple of minutes so you can read it alongside the rest of the AI ecosystem. If your own API calls are failing but the status page is green, also check your API key, credit balance, and the specific endpoint you are calling before assuming a platform outage."
      },
      {
        "question": "What should I do when Stability AI is down?",
        "answer": "First confirm it is the platform and not your integration: check your credit balance and that you are hitting the correct platform.stability.ai endpoint. Because Stable Diffusion and SDXL are open-weight models, the same models are hosted by independent providers like Replicate, Together AI, Fireworks AI, and Hugging Face, so you can often fail over there during a Stability platform incident. For Stability-exclusive models such as Stable Image Ultra, queueing and retrying with backoff is usually the only option until the platform recovers."
      },
      {
        "question": "How often does Stability AI go down, and how reliable is it?",
        "answer": "Stability AI's hosted platform API is generally stable, with most disruptions being brief degradations rather than full outages. Image and audio generation are compute-heavy, so the most common issue you will see is slower response times or queueing under load rather than hard downtime. Stability does not publish a formal uptime SLA the way some enterprise clouds do, so treat the official status page and incident history as your best reliability signal."
      },
      {
        "question": "Which models and services does Stability AI run?",
        "answer": "The platform API covers the Stable Image family (Ultra, Core, and the SD3.x / Stable Diffusion 3.5 generate endpoints), Stable Diffusion and SDXL image generation, a set of edit and control tools (inpaint, outpaint, upscale, background removal, structure and sketch control), and Stable Audio for music and sound generation. A common point of confusion: a Stability platform outage only affects models you call through platform.stability.ai. If you run Stable Diffusion or SDXL through a third-party host or locally, that is unaffected by Stability's own platform status."
      },
      {
        "question": "Where can I see Stability AI incident history?",
        "answer": "The official status page at status.stability.ai keeps a log of past incidents and maintenance windows, which is the best place to review historical reliability and read postmortems when Stability publishes them. For a broader cross-provider view, the TensorFeed status dashboard tracks Stability AI alongside the other major image, video, and audio model providers so you can spot whether an issue is isolated or part of a wider regional incident."
      }
    ],
    "failover": [
      {
        "title": "Fail over to a Stable Diffusion / SDXL host",
        "text": "Stable Diffusion and SDXL are open-weight models, so the exact models you call on Stability's platform are also served by independent inference providers running on their own infrastructure. During a Stability platform incident you can route image generation to Replicate, Together AI, or Fireworks AI, or pull weights from Hugging Face, with little to no change to your prompts.",
        "links": [
          {
            "label": "Is Replicate down?",
            "href": "/is-replicate-down"
          },
          {
            "label": "Is Together AI down?",
            "href": "/is-together-down"
          },
          {
            "label": "Is Hugging Face down?",
            "href": "/is-huggingface-down"
          }
        ]
      },
      {
        "title": "Reach for a comparable media model",
        "text": "If you need generative media output and Stability is unavailable, neighboring tools cover overlapping ground: ElevenLabs for audio in place of Stable Audio, and Runway or Luma for motion if your pipeline can use video output. Check their live status before you switch so you are not failing over into a second outage.",
        "links": [
          {
            "label": "Is ElevenLabs down?",
            "href": "/is-elevenlabs-down"
          },
          {
            "label": "Is Runway down?",
            "href": "/is-runway-down"
          },
          {
            "label": "Is Luma down?",
            "href": "/is-luma-down"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Skip the manual refreshing. TensorFeed can alert you the moment Stability AI's status flips between operational, degraded, and down, so you know to fail over without watching the dashboard. You can also browse the full multi-provider status board and open-weights catalog to plan a backup route in advance.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "All AI service status",
            "href": "/status"
          },
          {
            "label": "Open-weight models",
            "href": "/open-weights"
          }
        ]
      }
    ]
  },
  "runway": {
    "slug": "runway",
    "displayName": "Runway",
    "statusServiceName": "Runway",
    "providerName": "Runway",
    "providerUrl": "https://runwayml.com",
    "statusPageUrl": "https://status.runwayml.com",
    "metaTitle": "Is Runway Down? Live Runway AI Video Status",
    "metaDescription": "Check if Runway is down right now. Real-time Runway status with live updates from the official status page, covering Gen-4, Gen-3, Act-One, and the Runway API.",
    "serviceDescription": "Runway is an AI video generation platform whose models (Gen-3 Alpha, Gen-4, and the Act-One performance capture tool) power text-to-video, image-to-video, and character animation through a web app and a developer API.",
    "faqs": [
      {
        "question": "Is Runway down right now?",
        "answer": "The live indicator at the top of this page is the answer. A green dot means Runway is operational, amber means degraded performance (generations may queue or run slowly), and red means an active outage. We refresh it every couple of minutes against Runway's own published status, so trust the dot over rumors on social media."
      },
      {
        "question": "How do I check Runway status?",
        "answer": "Runway publishes an official status page at status.runwayml.com that lists component health and any active incidents. This page mirrors that feed so you can read it alongside every other AI service we track. If the official page and our indicator disagree, the official page is the source of truth and usually updates first."
      },
      {
        "question": "What should I do when Runway is down?",
        "answer": "First confirm it is Runway and not your own connection or an expired session by reloading and re-authenticating. If generations are stuck, avoid resubmitting the same job repeatedly, since that can deepen a queue backlog once service recovers. For time-sensitive work, switch to a comparable video model such as Luma Dream Machine or Pika, and check back on the official status page for an estimated resolution."
      },
      {
        "question": "How often does Runway go down, and how reliable is it?",
        "answer": "Runway is generally stable for a generative video service, but video generation is compute-heavy, so the most common disruption is degraded performance (longer queues and slower renders) rather than a hard outage. Incidents tend to cluster around new model launches or major feature releases when demand spikes. We do not publish a precise uptime percentage because Runway does not, and inventing one would be misleading."
      },
      {
        "question": "Which Runway models and services does this cover?",
        "answer": "This tracks the Runway platform as a whole: the Gen-3 Alpha and Gen-4 video models, the Act-One performance capture tool for character animation, the Frames image model, and the Runway Developer API. Note that Runway is a distinct company from Runway ML libraries or other similarly named tools, and a problem in the web app does not always mean the API is down (and vice versa)."
      },
      {
        "question": "Where can I see Runway incident history?",
        "answer": "The official status page at status.runwayml.com keeps a running history of past incidents, including start times, affected components, and resolution notes. That archive is the best place to see whether a current slowdown matches a known recurring pattern. For a broader view across the AI ecosystem, our /status board shows live health for every major provider side by side."
      }
    ],
    "failover": [
      {
        "title": "Switch to a comparable video model",
        "text": "Runway is one of several strong text-to-video and image-to-video options. Luma Dream Machine is the closest like-for-like alternative for cinematic clips, and Pika is another quick swap. If you only need a still frame or a storyboard input rather than motion, an image model from Stability AI can bridge the gap while Runway recovers. Check each one's live status before you commit a deadline to it.",
        "links": [
          {
            "label": "Is Luma down?",
            "href": "/is-luma-down"
          },
          {
            "label": "Is Stability AI down?",
            "href": "/is-stability-ai-down"
          },
          {
            "label": "Live status of every AI service",
            "href": "/status"
          }
        ]
      },
      {
        "title": "Reach the same kind of model through a different host",
        "text": "If you were calling Runway through its API for a pipeline, some open and hosted media models live behind general inference platforms with independent infrastructure. Replicate and Hugging Face host a wide catalog of image and video models on separate uptime, so a Runway incident does not take them down with it. Browse what is available and route around the outage.",
        "links": [
          {
            "label": "Is Replicate down?",
            "href": "/is-replicate-down"
          },
          {
            "label": "Is Hugging Face down?",
            "href": "/is-huggingface-down"
          },
          {
            "label": "Open-weights models",
            "href": "/open-weights"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Instead of refreshing this page, subscribe to status alerts and let us tell you the moment Runway flips back to operational (or starts degrading). It is the fastest way to know when it is safe to resume a render queue without babysitting the dashboard.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          }
        ]
      }
    ]
  },
  "luma": {
    "slug": "luma",
    "displayName": "Luma",
    "statusServiceName": "Luma",
    "providerName": "Luma AI",
    "providerUrl": "https://lumalabs.ai",
    "statusPageUrl": "https://status.lumalabs.ai",
    "metaTitle": "Is Luma Down? Live Luma AI Dream Machine Status",
    "metaDescription": "Is Luma AI down right now? Live Luma status with updates from the official status page. Covers the Luma API, Dream Machine video generation, and Photon images.",
    "serviceDescription": "Luma AI (Luma Labs) is a generative media company best known for Dream Machine, its text-to-video and image-to-video product powered by the Ray model family, plus the Photon image models and a developer API for programmatic video and image generation.",
    "faqs": [
      {
        "question": "Is Luma AI down right now?",
        "answer": "The live indicator near the top of this page is the answer. A green operational badge means the Luma API and Dream Machine are running normally; amber means degraded performance (usually slower generations or longer render queues); red means an active outage. We refresh the signal every couple of minutes from Luma's own status feed, so read the colored badge rather than relying on this text."
      },
      {
        "question": "How do I check Luma AI status?",
        "answer": "The fastest read is the live badge on this page, which mirrors Luma's official status page at status.lumalabs.ai. You can also open that page directly for component-level detail and any posted incident notes. For a sanity check during a suspected outage, the Luma Discord and the @LumaLabsAI account on X often confirm whether others are seeing the same failures before an incident is formally posted."
      },
      {
        "question": "What should I do when Luma AI is down?",
        "answer": "First confirm it is Luma and not your own setup: re-check your API key, your account credit balance, and whether you are hitting a rate limit, since those return errors that look like an outage. If Luma is genuinely down, queued Dream Machine jobs usually resume once service recovers, so avoid spamming retries that burn credits. For time-sensitive work, switch to a comparable video tool (see the fallback options below) and come back to Luma when the badge turns green."
      },
      {
        "question": "How often does Luma AI go down, and is it reliable?",
        "answer": "Luma is generally stable for a fast-moving generative media startup, but it is more prone to capacity-driven slowdowns than a hyperscaler API. The common pattern is degraded performance (longer render queues and slower turnaround) right after a major model launch or a viral moment, rather than a full hard outage. We do not publish a specific uptime percentage because Luma does not, so treat heavy queueing as the typical failure mode and full downtime as comparatively rare."
      },
      {
        "question": "Which Luma models and services does this page cover?",
        "answer": "It tracks the Luma surface as a whole: the Luma API, Dream Machine (text-to-video and image-to-video, powered by the Ray model family including Ray2), and the Photon image generation models. Note the naming can confuse people. \"Dream Machine\" is the consumer-facing product brand, while \"Ray\" and \"Photon\" are the underlying models you call by name through the API. A web or app outage does not always mean the API is down, and vice versa, so check the component breakdown when one part fails."
      },
      {
        "question": "Where can I see Luma AI incident history?",
        "answer": "Luma's official status page at status.lumalabs.ai keeps a running log of past incidents with timestamps and resolution notes, which is the authoritative record. For broader context across many providers at once, our /status dashboard tracks Luma alongside other major AI services, so you can tell whether a problem is Luma-specific or part of a wider provider event."
      }
    ],
    "failover": [
      {
        "title": "Switch to a comparable video generator",
        "text": "If Dream Machine is queueing or down and you need text-to-video or image-to-video now, Runway (the Gen-3 and Gen-4 families) is the closest substitute for cinematic clips. Replicate also hosts a range of open and hosted video models you can call through one API while Luma recovers. Re-run the same prompt and compare, since each model handles motion and prompt adherence differently.",
        "links": [
          {
            "label": "Is Runway down?",
            "href": "/is-runway-down"
          },
          {
            "label": "Is Replicate down?",
            "href": "/is-replicate-down"
          },
          {
            "label": "Live AI service status",
            "href": "/status"
          }
        ]
      },
      {
        "title": "Cover the rest of your media pipeline",
        "text": "A Luma outage often only blocks one stage of a project. If you need still images instead of video, Stability AI covers image generation directly, and Hugging Face hosts many open image and video models you can run when a hosted API stalls. For voiceover and audio to pair with your clips, ElevenLabs is unaffected by Luma incidents.",
        "links": [
          {
            "label": "Is Stability AI down?",
            "href": "/is-stability-ai-down"
          },
          {
            "label": "Is Hugging Face down?",
            "href": "/is-huggingface-down"
          },
          {
            "label": "Is ElevenLabs down?",
            "href": "/is-elevenlabs-down"
          }
        ]
      },
      {
        "title": "Get notified when status changes",
        "text": "Rather than reloading the status page, set an alert and let us tell you the moment Luma flips between operational, degraded, and down. That way you can step away from a stuck render queue and get pinged when generation comes back online, instead of burning credits on retries during an active incident.",
        "links": [
          {
            "label": "Set up status alerts",
            "href": "/alerts"
          },
          {
            "label": "Live AI service status",
            "href": "/status"
          }
        ]
      }
    ]
  }
};
