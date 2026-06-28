---
name: AI gateway supported models
description: Which Anthropic models the Replit AI gateway accepts, and how to construct the SDK client.
---

As of June 2026 the Replit Anthropic gateway (`AI_INTEGRATIONS_ANTHROPIC_BASE_URL`)
only accepts `claude-sonnet-4-6`. Other model ids, including
`claude-3-5-haiku-20241022`, `claude-3-5-haiku-latest`, and
`claude-3-7-sonnet-latest`, return HTTP 400 `Model '...' is not supported.`

**Why:** older Claude models were retired from the gateway, so code that hardcoded a
haiku model started failing in production even though the call shape was correct
(symptom seen: org engagement summary and admin help-chat both errored / 500'd).

**How to apply:**
- Use `claude-sonnet-4-6` for any Anthropic call in this repo (perfAgent.ts already does).
- Construct the SDK with explicit config, never no-arg:
  `new Anthropic({ apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY, baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL })`.
- To check what the gateway accepts, POST `${BASE_URL}/v1/messages` with headers
  `x-api-key: $AI_INTEGRATIONS_ANTHROPIC_API_KEY` and `anthropic-version: 2023-06-01`;
  a 400 "not supported" means that model id is dead.
- OpenAI-style models (gpt-*) go through a different gateway and are unaffected.
