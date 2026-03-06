# Old-to-New Documentation Map

Use this mapping when updating bookmarks, internal links, and onboarding references.

| Old path | New path | Status |
| --- | --- | --- |
| `docs/deployment.md` (command-by-command setup/checklist sections) | `docs/operator/daily-operations.md` + `docs/operator/approvals-and-access.md` + `docs/operator/csv-import.md` | Split into operator runbooks |
| `docs/deployment.md` (legacy trigger matrix and duplicated troubleshooting text) | `docs/archive/deployment-legacy.md` | Archived |
| `docs/code-review.md` (dated review findings/recommendations) | `docs/archive/code-review-legacy.md` | Archived snapshot |
| `docs/system-architecture.md` | `docs/source-of-truth-architecture.md` (entry point), then back to detailed architecture docs | Canonical entry point added |
| `docs/launch-guide.md` | `docs/archive/launch-guide.md` (if retained) and operator docs for current operations | Legacy launch narrative |

## Migration policy

- New operational changes must target `docs/operator/*`.
- Architecture references must start from `docs/source-of-truth-architecture.md`.
- Archive docs are read-only context and should not be used as implementation authority.
