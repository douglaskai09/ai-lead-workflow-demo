# AI Lead Workflow Demo

A small, inspectable portfolio project showing how an inbound lead can move through a practical AI-assisted sales workflow.

## What it demonstrates

**Lead intake → duplicate check → qualification → score/category → follow-up draft → human approval → pipeline dashboard**

The demo is intentionally dependency-light so a client can understand the workflow quickly without needing a private API key or production database.

## Run it

Open `index.html` in a browser. No build step is required.

For a simple local server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Demo workflow

1. Submit an inbound lead.
2. The workflow normalizes the lead and checks for duplicates by email/phone.
3. A deterministic demo scoring engine evaluates intent, urgency, budget signals, and service fit.
4. The lead receives a score, priority, category, and concise reasoning.
5. A suggested follow-up message is generated.
6. The follow-up remains in **Needs approval** until a human approves it.
7. The dashboard updates the pipeline and activity log.

## Why the AI step is deterministic here

This public demo does **not** ship a secret API key in browser code. The qualification engine is a deterministic stand-in for a production model call so the complete workflow can be inspected safely.

In a client implementation, `qualifyLead()` would normally be replaced by a server-side OpenAI/Anthropic call with:

- structured JSON output
- schema validation
- retries/timeouts
- usage logging
- safe error handling
- prompt/version tracking

## Production architecture

```text
Lead source
   |
   v
API / webhook
   |
   +--> normalize + validate
   +--> idempotency / duplicate check
   |
   v
AI qualification service
   |
   +--> structured score + category + reasoning
   |
   v
CRM / database
   |
   +--> follow-up draft
   +--> approval queue
   +--> activity log
   |
   v
Human approves
   |
   v
Email / SMS / CRM action
```

## Engineering choices shown

- explicit workflow states
- duplicate prevention
- deterministic business rules around AI output
- human-in-the-loop approval before outbound messaging
- transparent reasoning for lead scoring
- separation between intake, qualification, persistence, and action
- no client-side secrets
- testable sample data and reset behavior

## Files

- `index.html` — interface
- `styles.css` — responsive UI
- `app.js` — workflow logic
- `ARCHITECTURE.md` — production implementation notes

## Portfolio context

This project is designed as a compact public example of the kind of lead automation, CRM workflow, and AI-assisted business system that can be adapted to a client's actual stack (HubSpot, GoHighLevel, Salesforce, Notion, Airtable, Supabase, n8n, Make, Slack, Gmail, Twilio, etc.).
