# Repository Audit: Migration Fit for Slack → Slack Workflow Steps → AI Agents → Google Sheets → Apps Script → Gemini AI Studio

## A. Executive Summary

This repository is already **partially aligned** with the target architecture because it is serverless and centered on Slack + Apps Script + Google Sheets. There are **no Docker, n8n, Postgres, Redis, or VPS deployment artifacts** in the codebase.

However, it is not fully migrated to the target model yet:

- Core flows are still command-centric (`/onboard`, `/learn`, `/submit`) rather than Workflow Step-centric.
- AI agents exist mostly as naming conventions in code (`tutorAgent`, `quizAgent`) rather than formal role-based components with clear contracts.
- Gemini AI Studio integration is not formalized.
- Security and governance need tightening (admin command authorization, workflow mutation boundaries, idempotency for retries).

**Decision:** salvage partially and continue migration with focused rewrites.

## B. Architecture Fit Assessment

### Fit by target layer

1. **Slack (Primary UI)** — **Good fit**
   - Strong slash command surface and app manifest coverage.
2. **Slack Workflow Steps** — **Partial fit**
   - Workflow payload routing exists, but business processes are not modeled as Slack-native guided workflows.
3. **AI Agents** — **Partial fit**
   - Agent-style function names exist, but contracts/triggers/boundaries are not formalized.
4. **Google Sheets as operational DB** — **Strong fit**
   - Centralized sheet CRUD and templates are present.
5. **Apps Script as automation/business logic** — **Strong fit**
   - Web app entrypoint + schedulers + sheet integration are mature.
6. **Gemini AI Studio (separate generation system)** — **Weak fit**
   - CSV import path exists, but no explicit Gemini handoff contract, schema guardrails, or operator process.
7. **Low-maintenance ops model** — **Partial fit**
   - Lightweight infra, but still too much bespoke command handling where Workflow Steps could reduce custom logic.

## C. Files to Keep

- `apps-script/database.gs` (clean CRUD wrapper over Sheets).
- `apps-script/logging.gs` (centralized auditing and failure logs).
- `apps-script/utils.gs` (shared helpers).
- `apps-script/security.gs` (keep with hardening).
- `apps-script/csvImport.gs` (keep as Gemini/CSV ingestion bridge, with schema validation).
- `slack/slack-app-manifest.yaml` (good base manifest).
- `database/*.csv` templates (operational schema seed).
- `sheets/*.md` setup docs (conceptually correct and operator-friendly).

## D. Files to Rewrite

- `apps-script/Code.gs` — separate command, workflow-step, and event pathways; make Workflow Steps primary for guided flows.
- `apps-script/router.gs` — convert route handlers into workflow action handlers + role checks.
- `apps-script/workflow.gs` — constrain sheet access with explicit action allowlists and schema-aware adapters.
- `apps-script/submissions.gs` — add idempotency keys and dedupe for Slack retries.
- `apps-script/scheduler.gs` — move reminders/escalations into workflow-driven + operator-visible handoff patterns.
- `docs/workflow.md` and `docs/deployment.md` — align with modern Slack Workflow model and explicit Gemini integration runbooks.

## E. Files to Delete

- None immediately. The repo is already lightweight and mostly relevant.

## F. Files to Archive

- Archive slash-command-only operating mode guidance (after workflow-step migration) into `docs/archive/`.
- Archive legacy token-fallback security guidance once signature-based verification path is fully enforced.

## G. Dependencies to Remove

- No package-level dependencies to remove were found in this repository.
- **Configuration dependency to phase out:** `SLACK_VERIFICATION_TOKEN` fallback path (deprecated model).

## H. Slack Workflow Opportunities

1. **Approvals:** replace `/report` ad-hoc usage with workflow forms + approval step + post-approval report generation.
2. **Lesson release:** convert manual `/learn` pull loop into guided step chain (check eligibility → fetch lesson → confirm delivery).
3. **Content review routing:** on CSV import, route through reviewer workflow step before `Lessons` write.
4. **Admin actions:** use workflow forms for enroll/unenroll overrides with audit metadata.
5. **Escalations/reminders:** convert scheduled nudges into workflow-based reminders with operator override.
6. **Human+AI handoffs:** explicit workflow stages: AI draft → human approve/edit → Apps Script write.

## I. AI Agent Opportunities

### 1) Content Formatter Agent
- **Purpose:** normalize Gemini-generated lesson content into LMS schema.
- **Inputs:** Gemini CSV/text output, expected headers.
- **Outputs:** validated row objects + quality flags.
- **Trigger:** CSV upload/import start.
- **Where it lives:** Apps Script (or Gemini prompt contract + Apps Script validator).
- **Current support:** partial (`csvImport.gs` exists); needs schema + content validation rewrite.

### 2) Lesson QA Agent
- **Purpose:** detect missing pedagogy sections and invalid lesson IDs.
- **Inputs:** candidate lesson rows.
- **Outputs:** pass/fail + remediation notes.
- **Trigger:** pre-import and pre-release workflow step.
- **Where it lives:** Gemini generation + Apps Script QA gate.
- **Current support:** missing.

### 3) Taxonomy/Tagging Agent
- **Purpose:** assign tags/difficulty/topic clusters for reporting.
- **Inputs:** lesson text.
- **Outputs:** normalized taxonomy fields.
- **Trigger:** after content format step.
- **Where it lives:** Gemini output transform + sheet write step.
- **Current support:** missing formal implementation.

### 4) Training Scheduler/Support Agent
- **Purpose:** decide reminder cadence/escalations based on learner status.
- **Inputs:** learner progress + inactivity windows.
- **Outputs:** reminder actions / escalation recommendations.
- **Trigger:** daily workflow schedule.
- **Where it lives:** Apps Script scheduler + Slack workflows.
- **Current support:** partial (`scheduler.gs`), needs workflow visibility and override controls.

### 5) Sheet Updater Agent
- **Purpose:** centralized write mediator for Sheets (validated writes only).
- **Inputs:** typed mutation requests.
- **Outputs:** write result + audit event.
- **Trigger:** any workflow write action.
- **Where it lives:** Apps Script workflow adapter.
- **Current support:** partial (`workflow.gs`), needs allowlist and policy checks.

### 6) Admin Support Agent
- **Purpose:** answer operational/admin prompts and execute approved actions.
- **Inputs:** admin Slack workflow form requests.
- **Outputs:** suggested action + approved execution.
- **Trigger:** admin workflow start.
- **Where it lives:** Slack workflow + Apps Script action endpoints.
- **Current support:** weak (`/report` exists but no authorization boundary).

### 7) Reporting/Summarizer Agent
- **Purpose:** produce concise weekly summaries for operators.
- **Inputs:** learners/submissions/logs.
- **Outputs:** channel summary + anomalies.
- **Trigger:** weekly scheduled workflow.
- **Where it lives:** Apps Script + optional Gemini summarization.
- **Current support:** partial (`weeklyLeaderboard`, `progressReport`) but not role-aware or narrative-rich.

## J. Recommended New Folder Structure

```text
/README.md
/architecture.md
/slack/
  app-manifest.yaml
  workflows/
    onboarding-workflow.md
    lesson-delivery-workflow.md
    review-approval-workflow.md
/apps-script/
  entrypoints/
    webhook.gs
    workflowHandlers.gs
  agents/
    contentFormatter.gs
    lessonQa.gs
    taxonomyTagger.gs
    schedulerSupport.gs
    sheetUpdater.gs
    adminSupport.gs
    reportingSummarizer.gs
  core/
    config.gs
    security.gs
    database.gs
    logging.gs
    utils.gs
  integrations/
    slackApi.gs
    geminiImport.gs
  jobs/
    schedules.gs
/database/
  templates/*.csv
/docs/
  migration/
  operator/
  archive/
```

## K. Risks Blocking Migration

1. **Unscoped workflow writes** can mutate arbitrary sheet tabs.
2. **No admin authorization model** for admin-style commands/actions.
3. **No idempotency strategy** for submission retries causing duplicate records.
4. **Interactive workflow handlers are placeholders**; handoffs are not truly workflow-native.
5. **Gemini content pipeline not formalized** (contract + validation + approval).
6. **Docs include mixed old/new guidance**, which can mislead operators.

## L. Quick Wins

1. Add admin allowlist for `/report` and any mutating admin workflows.
2. Add request idempotency key checks before `Submissions` writes.
3. Add `ALLOWED_WORKFLOW_SHEETS` config and enforce in `workflow.gs`.
4. Introduce one high-value Slack Workflow Step flow (lesson release approval).
5. Add CSV schema validator before `replaceSheetData` in import.
6. Split docs into operator runbook vs developer internals.

## M. Step-by-Step Refactor Plan

1. **Stabilize guardrails**: admin RBAC, idempotency, workflow sheet allowlist.
2. **Formalize contracts**: define input/output schemas for each AI agent role.
3. **Workflow-first conversion**: migrate onboarding, lesson release, submission review to Slack workflows.
4. **Gemini pipeline**: define generation template + validator + approval workflow.
5. **Code modularization**: move to `core/`, `agents/`, `entrypoints/`, `integrations/` structure.
6. **Documentation cleanup**: retire ambiguous sections and create operator-focused runbooks.
7. **Pilot + cutover**: run one course fully workflow-driven, then deprecate slash-command-only paths.

## N. Final Verdict

**salvage partially**

The repository is a strong lightweight base for the target architecture, but still requires focused rewrites to become truly workflow-first, agent-formalized, and operator-safe.

---

## Detailed Issue Register

| Severity | File/Folder | Issue | Action | Reason | New Architecture Replacement |
| --- | --- | --- | --- | --- | --- |
| High | `apps-script/workflow.gs` | Workflow actions allow arbitrary `sheetName` read/write/update with no allowlist. | Rewrite | Security + data integrity risk. | Add explicit sheet/action policy map (e.g., action→allowed tabs/fields). |
| High | `apps-script/submissions.gs` | Submission writes lack idempotency/dedupe, so Slack retries can duplicate records. | Rewrite | Duplicate progress/submission corruption risk. | Idempotency key table + duplicate suppression in Apps Script. |
| High | `apps-script/submissions.gs` | `/report` has no admin authorization boundary. | Rewrite | Any user can access admin aggregate data. | Slack workflow form + approver check + role allowlist. |
| Medium | `apps-script/router.gs` | Interactive handling is placeholder and not tied to workflow step state transitions. | Rewrite | Missed Slack Workflow Step capabilities. | Implement workflow action callbacks + human-in-the-loop handoffs. |
| Medium | `apps-script/security.gs` | Verification token fallback depends on legacy pattern and can cause ambiguity. | Rewrite | Security posture and maintenance clarity. | Prefer signature verification; keep fallback only as temporary hard-fail logged mode. |
| Medium | `apps-script/scheduler.gs` | Reminders/leaderboard operate as opaque jobs instead of visible workflow orchestration. | Rewrite | Reduced operator visibility and approval control. | Scheduled workflow triggers with approval/escalation steps. |
| Medium | `docs/deployment.md` | Mixed guidance on deprecated workflow step config and current behavior may confuse operators. | Rewrite | Migration/operator confusion. | Split into “current supported setup” + “migration notes” docs. |
| Medium | `docs/workflow.md` | Workflow docs are conceptual but not mapped to concrete Slack workflow definitions. | Rewrite | Hard to operationalize process ownership. | Add per-workflow spec files with inputs/outputs/owners. |
| Low | `apps-script/learners.gs` | Placeholder learner email generation (`user_name@example.com`) is synthetic and misleading. | Rewrite | Data quality issue for downstream reporting/integrations. | Keep email optional or fetch real value via Slack API/admin input. |
| Low | `apps-script/scheduler.gs` | Default leaderboard channel fallback `C00000000` invites silent misconfiguration. | Rewrite | Operational reliability issue. | Require explicit property and fail loudly with clear operator message. |
| Low | `docs/code-review.md` | Mentions future recommendations but no explicit migration status tracking. | Archive/Rewrite | Can drift and mislead future refactors. | Replace with living migration checklist linked to architecture target. |

