# AI API Pricing Guide: Every Provider Compared

> Source: https://tensorfeed.ai/ai-api-pricing-guide
> Last generated: 2026-04-17

Last Updated: March 2026

      # 
        AI API Pricing Guide: Every Provider Compared

          AI API pricing in 2026 ranges from free open-source models to $75 per million tokens for
          premium models like Claude Opus. Most developers spend between $0.10 and $15 per million
          input tokens depending on the model tier and use case.

        AI API pricing can be confusing. Every provider uses slightly different units, some charge
        differently for input and output tokens, and prices change frequently. This guide breaks
        it all down in one place, with real cost examples so you can estimate what your project
        will actually cost. All prices are in USD per 1 million tokens unless noted otherwise.

        ## Table of Contents

          - Pricing Overview: All Models
          - Pricing by Provider
          - Cost Calculator Examples
          - Free Tier Comparison
          - Price Per Task Estimates
          - Tips for Reducing API Costs
          - Understanding Tokens

        ## Pricing Overview: All Models

          Here is every major API model with its current pricing, sorted by provider. Prices are
          per 1 million tokens. For context, 1 million tokens is roughly 750,000 words, or about
          4-5 full-length novels.

        ## Pricing by Provider

        ## Cost Calculator Examples

          Abstract token prices are hard to reason about. Here are concrete examples showing what
          common tasks actually cost with different models. These assume typical token counts for
          each task type.

            ### 
              Example 1: Chatbot Application (10,000 conversations/month)

              Assuming each conversation averages 2,000 input tokens and 1,000 output tokens:

                | 

                    Model 
                    | Input Cost 
                    | Output Cost 
                    | Total/month 
                  |

                    | Claude Opus 4.7 
                    | $300.00 
                    | $750.00 
                    | $1,050.00 
                  |

                    | Claude Sonnet 4.6 
                    | $60.00 
                    | $150.00 
                    | $210.00 
                  |

                    | GPT-4o 
                    | $50.00 
                    | $100.00 
                    | $150.00 
                  |

                    | GPT-4o-mini 
                    | $3.00 
                    | $6.00 
                    | $9.00 
                  |

                    | Claude Haiku 4.5 
                    | $16.00 
                    | $40.00 
                    | $56.00 
                  |

                    | Gemini 2.0 Flash 
                    | $2.00 
                    | $4.00 
                    | $6.00 
                  |

              The takeaway: there is a 175x cost difference between the most expensive and cheapest
              options for the same workload. Choosing the right model matters enormously.

            ### 
              Example 2: Document Summarization (1,000 documents/month)

              Assuming each document is 10,000 input tokens and the summary is 500 output tokens:

                | 

                    Model 
                    | Total/month 
                  |

                    | Claude Opus 4.7 
                    | $187.50 
                  |

                    | Gemini 2.5 Pro 
                    | $17.50 
                  |

                    | Mistral Small 
                    | $1.15 
                  |

                    | Gemini 2.0 Flash 
                    | $1.20 
                  |

            ### 
              Example 3: Code Generation (500 requests/day)

              Assuming 1,500 input tokens (prompt + context) and 2,000 output tokens (generated code) per request:

                | 

                    Model 
                    | Total/month 
                  |

                    | o1 (reasoning) 
                    | $2,137.50 
                  |

                    | Claude Sonnet 4.6 
                    | $517.50 
                  |

                    | GPT-4o 
                    | $356.25 
                  |

                    | o3-mini 
                    | $156.75 
                  |

                    | GPT-4o-mini 
                    | $21.38 
                  |

        ## Free Tier Comparison

          Most providers offer free API access with usage limits. Here is what you get without
          spending anything:

            | 

                Provider 
                | Free Tier Details 
                | Models Available 
                | Limits 
              |

                | OpenAI 
                | Free credits for new accounts 
                | GPT-4o-mini, GPT-3.5 
                | Rate limited; credit expires 
              |

                | Anthropic 
                | Free credits for new accounts 
                | Claude Haiku, Sonnet 
                | Rate limited; credit expires 
              |

                | Google 
                | Generous free tier via AI Studio 
                | Gemini 2.0 Flash, 2.5 Pro (limited) 
                | 15 RPM for Flash; lower for Pro 
              |

                | Mistral 
                | Free tier available 
                | Mistral Small, open models 
                | Rate limited 
              |

                | Meta (via hosts) 
                | Free self-hosting; hosted free tiers vary 
                | Llama 4 Scout, Maverick 
                | Unlimited if self-hosted 
              |

            **Pro tip:** Google AI Studio offers the
            most generous free API access. If you are prototyping or building a low-traffic
            application, you can potentially run entirely on Google's free tier with Gemini
            2.0 Flash.

        ## Price Per Task Estimates

          Here is roughly what common tasks cost per individual request using different model tiers.
          These are estimates based on typical token counts.

            | 

                Task 
                | Tokens (in/out) 
                | Frontier Model 
                | Mid-tier Model 
                | Budget Model 
              |

                | Summarize an article 
                | 3K / 300 
                | $0.067 
                | $0.014 
                | $0.0006 
              |

                | Translate 1 page 
                | 500 / 600 
                | $0.052 
                | $0.011 
                | $0.0004 
              |

                | Generate a function 
                | 1K / 500 
                | $0.053 
                | $0.011 
                | $0.0005 
              |

                | Write a blog post 
                | 500 / 3K 
                | $0.233 
                | $0.047 
                | $0.0019 
              |

                | Analyze a spreadsheet 
                | 10K / 1K 
                | $0.225 
                | $0.045 
                | $0.0016 
              |

                | Chat response (avg) 
                | 2K / 500 
                | $0.068 
                | $0.014 
                | $0.0005 
              |

          Frontier model = Claude Opus 4.7 / o1. Mid-tier = Claude Sonnet 4.6 / GPT-4o. Budget = GPT-4o-mini / Gemini Flash.

        ## Tips for Reducing API Costs

          API costs can add up quickly, especially at scale. Here are practical strategies for
          keeping them under control:

            ### 1. Use the smallest model that works

              This is the single most impactful optimization. For many tasks, GPT-4o-mini or
              Gemini Flash produces results that are nearly as good as frontier models at a
              fraction of the cost. Test your use case with cheaper models first and only upgrade
              if quality is genuinely insufficient. A model that is 10x cheaper and 95% as good
              is almost always the right choice.

            ### 2. Implement caching

              If users ask similar questions, cache the responses. Both Anthropic and OpenAI offer
              prompt caching features that can reduce costs by up to 90% for repeated prefixes.
              Even simple application-level caching (storing responses for identical inputs) can
              save significant money.

            ### 3. Optimize your prompts

              Shorter prompts cost less. Remove unnecessary instructions, examples, and context.
              Use system prompts efficiently. If you are including few-shot examples, test whether
              you really need all of them. Often 1-2 examples work nearly as well as 5-6.

            ### 4. Set max token limits

              Always set a max_tokens parameter to prevent unexpectedly long (and expensive)
              responses. For a summarization task, you probably do not need more than 500 output
              tokens. For code generation, 2,000 is usually plenty.

            ### 5. Use model routing

              Route different requests to different models based on complexity. Simple questions
              go to a cheap model; complex ones go to a frontier model. You can implement this
              with a classifier (which itself can be a cheap model) or with simple heuristics
              based on input length or keywords.

            ### 6. Batch your requests

              Both OpenAI and Anthropic offer batch APIs with 50% discounts. If your use case
              does not require real-time responses (e.g., processing a backlog of documents),
              batching can cut your costs in half.

            ### 7. Consider open source models

              For high-volume applications, self-hosting an open source model like Llama 4 or
              Mistral can be dramatically cheaper than API calls. The upfront infrastructure cost
              is higher, but per-request costs approach zero. See our 

                open source LLM guide

              for details.

        ## Understanding Tokens

          Tokens are the fundamental unit of AI API pricing. A token is roughly three-quarters of
          a word in English. Here are some helpful benchmarks:

            - **1 token** = roughly 4 characters or 0.75 words in English
            - **100 tokens** = roughly 75 words (a short paragraph)
            - **1,000 tokens** = roughly 750 words (about 1.5 pages)
            - **10,000 tokens** = roughly 7,500 words (a long article)
            - **100,000 tokens** = roughly 75,000 words (a short novel)
            - **1,000,000 tokens** = roughly 750,000 words (several novels)

          Important: input tokens and output tokens are priced differently, with output tokens
          typically costing 2-5x more than input tokens. This is because generating text is more
          computationally intensive than processing it. When estimating costs, always account for
          both sides.

        ## Frequently Asked Questions

            ### How much does the OpenAI API cost?

              OpenAI API pricing varies by model. GPT-4o costs $2.50 per 1M input tokens and $10 per
              1M output tokens. GPT-4o-mini is much cheaper at $0.15/$0.60. The o1 reasoning model
              costs $15/$60.

            ### What is the cheapest AI API?

              Google's Gemini 2.0 Flash is one of the cheapest at $0.10 per 1M input tokens.
              Open-source models like Llama 4 are free to self-host. Groq offers fast inference at
              competitive prices.

            ### How are AI API tokens counted?

              Roughly, 1 token equals about 4 characters or 0.75 words in English. A 1,000-word
              document is approximately 1,333 tokens. Most APIs charge separately for input (prompt)
              and output (completion) tokens.

            ### Which AI API is best for production?

              For reliability and quality, Anthropic (Claude) and OpenAI (GPT-4o) are the most popular
              choices. For cost-sensitive applications, Gemini Flash or self-hosted open-source models
              offer the best value.

        ## Related Resources

          - 

              TensorFeed Model Tracker (live pricing data)

          - 

              Best AI Chatbots Compared (2026)

          - 

              Best Open Source LLMs in 2026

          - 

              Best AI Tools in 2026

          <- Back to Feed
