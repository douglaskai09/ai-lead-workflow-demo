# Production Architecture Notes

This public demo keeps the full workflow visible without exposing any API keys. A client implementation would move qualification and persistence behind authenticated server-side boundaries.

## Recommended production shape

```text
Website form / ad lead / CRM webhook
        |
        v
API route or workflow webhook
        |
        +--> schema validation
        +--> normalize email / phone
        +--> idempotency key
        +--> duplicate lookup
        |
        v
Qualification service
        |
        +--> deterministic business rules
        +--> LLM structured output
        +--> confidence / reason fields
        +--> timeout / retry policy
        |
        v
Database / CRM
        |
        +--> lead record
        +--> qualification record
        +--> workflow status
        +--> activity / audit log
        |
        v
Follow-up drafting
        |
        v
Human approval queue
        |
        +--> approve
        +--> edit
        +--> reject
        |
        v
Email / SMS / CRM action
```

## Data model

A minimal implementation can use these entities:

### Lead
- id
- name
- email_normalized
- phone_normalized
- source
- service_interest
- raw_message
- created_at

### Qualification
- lead_id
- score
- category
- priority
- reasons
- confidence
- model/version
- evaluated_at

### FollowUp
- lead_id
- draft
- status (`needs_approval`, `approved`, `rejected`, `sent`)
- approved_by
- approved_at
- sent_at

### ActivityEvent
- lead_id
- event_type
- metadata
- created_at

## Reliability controls

### Duplicate protection
Use normalized email/phone plus an idempotency key from the source event. The workflow should be safe if the same webhook is delivered more than once.

### AI output validation
The model should return a strict object such as:

```json
{
  "score": 78,
  "priority": "high",
  "category": "sales_ready",
  "reasons": ["Defined timeline", "Strong service fit"],
  "confidence": 0.86
}
```

Validate this server-side before using it. Invalid or missing output should route to manual review rather than silently inventing a score.

### Human-in-the-loop
Outbound communication should remain a draft until approval unless the client explicitly defines conditions where automatic sending is acceptable.

### Secrets
Provider keys, CRM tokens, service-role database keys, and webhook secrets belong in server-side environment variables. They should never be embedded in browser JavaScript.

### Observability
Log key workflow transitions without logging credentials or unnecessary personal data:

- intake accepted/rejected
- duplicate detected
- qualification completed/failed
- approval requested
- approval granted/rejected
- outbound action completed/failed

## Example stack choices

### Custom app
- Next.js / TypeScript
- Supabase / PostgreSQL
- OpenAI or Anthropic
- Vercel

### Low-code automation
- n8n or Make
- HubSpot / GoHighLevel / Airtable / Notion
- OpenAI or Anthropic
- Slack approval message
- Gmail / Twilio for outbound action

The architecture stays roughly the same regardless of the tools: normalize inputs, prevent duplicates, constrain AI output, persist state, require approval where appropriate, then execute the business action.
