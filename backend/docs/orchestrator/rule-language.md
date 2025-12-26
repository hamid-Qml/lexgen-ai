# Rule Language (v1)

Purpose
- A minimal JSON expression language used for compliance checks, guardrails, clause triggers, and show_if logic.
- Designed to be deterministic and auditable.

## Schema and Validation

- Schema: `backend/docs/orchestrator/rule-language.schema.json`
- Validator: `backend/src/orchestrator/rule-language.validator.ts`
- Note: `exists` and `empty` do not require a `value` field.

## Rule Shape

```json
{
  "rule_id": "COMP-001",
  "severity": "warning",
  "description": "NES minimum hours check",
  "when": { "var": "hours_per_week", "op": "gt", "value": 38 },
  "then": [
    {
      "action": "warn",
      "message": "Hours above the standard 38 per week may require award or NES justification.",
      "context": { "field": "hours_per_week" }
    }
  ]
}
```

## Expression Grammar

An expression is one of:

```json
{ "all": [<expression>, ...] }
{ "any": [<expression>, ...] }
{ "not": <expression> }
{ "var": "field_name", "op": "eq", "value": "X" }
```

### Operators
- `eq`, `ne`
- `gt`, `gte`, `lt`, `lte`
- `in` (value is array)
- `contains` (string or array contains value)
- `starts_with`, `ends_with`
- `regex` (value is regex string)
- `exists` (true if var is defined and not null)
- `empty` (true if var is null, empty string, or empty array)

### Values
- String, number, boolean, array
- Variable reference (optional): `{ "var": "other_field" }`

### Type Coercion
- `yes-no` questions should be normalized to boolean before evaluation.
- `number`, `currency`, `percentage` should be normalized to numeric values.

## Actions

Supported actions (extend as needed):

```json
{ "action": "warn", "message": "...", "context": { } }
{ "action": "block", "message": "..." }
{ "action": "set_clause_status", "clause_id": "CORE-007", "status": "excluded" }
{ "action": "set_variant", "clause_id": "CORE-005", "variant_id": "CORE-005-B" }
{ "action": "add_question", "question_key": "AUTO-super_rate" }
{ "action": "set_variable", "variable_key": "super_rate", "value": 11.5 }
```

## Examples

### 1) Gentle warning for excessive weekly hours
```json
{
  "rule_id": "COMP-HOURS-001",
  "severity": "warning",
  "when": {
    "all": [
      { "var": "hours_per_week", "op": "gt", "value": 38 },
      { "var": "award_coverage", "op": "ne", "value": "none" }
    ]
  },
  "then": [
    {
      "action": "warn",
      "message": "Hours above 38/week may require award or NES justification.",
      "context": { "field": "hours_per_week" }
    }
  ]
}
```

### 2) Clause variant override based on role level
```json
{
  "rule_id": "TRIGGER-ROLE-001",
  "severity": "info",
  "when": { "var": "role_level", "op": "in", "value": ["senior", "management", "executive"] },
  "then": [
    { "action": "set_variant", "clause_id": "CORE-005", "variant_id": "CORE-005-B" },
    { "action": "set_clause_status", "clause_id": "PROTECT-003", "status": "mandatory" }
  ]
}
```

### 3) Conditional question
```json
{
  "rule_id": "ASK-BONUS-001",
  "severity": "info",
  "when": { "var": "benefits", "op": "contains", "value": "bonus" },
  "then": [
    { "action": "add_question", "question_key": "AUTO-bonus_amount" }
  ]
}
```

## Show/Skip Rules

`show_if` and `skip_if` for questions should use the same expression format as `when`.

Example:
```json
{
  "show_if": { "var": "has_probation", "op": "eq", "value": true }
}
```
