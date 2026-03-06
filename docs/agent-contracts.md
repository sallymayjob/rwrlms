# Agent Contracts

This document defines the contract layer for proposed internal agents. Agents are designed to stay pure (transform/validate) wherever possible. Any spreadsheet write side-effect must be routed through the `sheet-updater` policy layer.

## Contract conventions

- **Input envelope**: plain JavaScript object passed from slash command, workflow trigger, or scheduler orchestration.
- **Output envelope**:
  - `ok: boolean`
  - `data: object` (agent-specific payload)
  - `errors?: string[]`
- **Write policy**: non-`sheet-updater` agents do not call direct sheet mutation methods (`appendRow`, `updateRowByField`, `deleteRowByField`).

## content-formatter

- **Purpose**: Convert normalized lesson/report data into Slack-ready text payloads.
- **Required inputs**:
  - lesson formatting: `{ LessonID, Topic, Module, Content?, Objective?, DueDate? }`
  - report formatting: `{ learners, activeLearners, completedLearners, submissions }`
- **Output schema**:
  - `{ ok: true, data: { text: string } }`
- **Trigger source**: workflow/manual/scheduled (wherever presentation text is needed).
- **Allowed side effects**: none (pure formatting only).

## lesson-qa

- **Purpose**: Validate lesson records before import/update operations.
- **Required inputs**:
  - `{ LessonID, Module, Topic, Status, ... }`
- **Output schema**:
  - `{ ok: true, data: { valid: boolean, issues: string[] } }`
- **Trigger source**: workflow/manual.
- **Allowed side effects**: none (pure validation only).

## taxonomy-tagger

- **Purpose**: Infer taxonomy tags from lesson topic/content/objective text.
- **Required inputs**:
  - `{ Topic?, Content?, Objective? }`
- **Output schema**:
  - `{ ok: true, data: { tags: string[] } }`
- **Trigger source**: workflow/manual/scheduled.
- **Allowed side effects**: none (pure transformation only).

## scheduler-support

- **Purpose**: Build reminder and leaderboard payloads for scheduled jobs.
- **Required inputs**:
  - reminder builder: learner list + lesson resolver callback
  - leaderboard builder: learner list + optional rank limit
- **Output schema**:
  - reminders: `{ ok: true, data: { reminders: [{ userId, lessonId, message }] } }`
  - leaderboard: `{ ok: true, data: { lines: string[] } }`
- **Trigger source**: scheduled.
- **Allowed side effects**: none (pure planning payloads only).

## sheet-updater

- **Purpose**: Enforce centralized write policy for all spreadsheet mutations.
- **Required inputs**:
  - `{ action, sheetName, row?, query? }`
  - `action` in `insert | update | delete`
  - `query` required for `update/delete` with `{ fieldName, fieldValue }`
- **Output schema**:
  - insert: `{ ok: true, data: { inserted: number, row: object } }`
  - update: `{ ok: true, data: { updated: number, row: object } }`
  - delete: `{ ok: true, data: { deleted: number } }`
  - failure: `{ ok: false, errors: string[] }`
- **Trigger source**: workflow/manual/scheduled (called by other agents/services).
- **Allowed side effects**:
  - `appendRow` via policy validation
  - `updateRowByField` via policy validation
  - `deleteRowByField` via policy validation

## admin-support

- **Purpose**: Parse and validate admin action requests before execution.
- **Required inputs**:
  - command text string (example: `reindex lessons`)
- **Output schema**:
  - parse: `{ ok: true, data: { action, target, arg } }`
  - validate: `{ ok: true, data: { allowed: true } }` or `{ ok: false, errors: string[] }`
- **Trigger source**: manual/workflow.
- **Allowed side effects**: none (pure parsing/guardrails).

## reporting-summarizer

- **Purpose**: Produce normalized KPI summary from learner/submission rows.
- **Required inputs**:
  - learners array
  - submissions array
- **Output schema**:
  - `{ ok: true, data: { learners, activeLearners, completedLearners, submissions } }`
- **Trigger source**: workflow/manual/scheduled.
- **Allowed side effects**: none (pure aggregation only).
