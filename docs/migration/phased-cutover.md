# Phased Documentation Cutover

## Phase 1: Introduce new structure (current)

- Create `docs/operator/`, `docs/migration/`, and `docs/archive/`.
- Publish source-of-truth architecture entrypoint.
- Annotate legacy pages with migration pointers.

## Phase 2: Redirect references

- Update README and team bookmarks to new operator pages.
- Replace deep links to deprecated sections with mapped targets.
- Add migration map checks in review process.

## Phase 3: Enforce new source-of-truth usage

- Treat archive docs as historical only.
- Require all new runbook edits under `docs/operator/`.
- Require architecture edits to update `docs/source-of-truth-architecture.md` links.

## Exit criteria

- No active internal links point to deprecated sections in `docs/deployment.md` or `docs/code-review.md`.
- Onboarding references the source-of-truth page first.
- Last 2 documentation updates occurred in new folder structure.
