# Code Review Notes

This review focuses on correctness and deployability of the Apps Script + Sheets implementation.

## Findings Addressed

1. **Request verification could fail in Apps Script deployments**
   - Issue: relying only on `X-Slack-*` headers can fail when Apps Script web apps do not expose headers.
   - Fix: `verifySlackRequest` now uses signature verification when headers are present, and falls back to Slack verification token validation (`payload.token`) otherwise.

2. **Course lesson filtering was a no-op**
   - Issue: `getLessonsForCourse(courseId)` always returned `true` in its filter, which ignored course boundaries.
   - Fix: Added month mapping (`Months` sheet) and LessonID prefix matching (`M##`) so lessons are filtered by course month membership.

3. **Dashboard formula column references were stale**
   - Issue: formulas pointed to wrong columns after schema updates.
   - Fix: Updated formulas:
     - `ActiveCourses`: `Courses!I2:I` (Status)
     - `ActiveLessons`: `Lessons!G2:G` (Status)

4. **Deployment docs missing token fallback property**
   - Issue: docs listed signing secret but not verification token used in fallback mode.
   - Fix: Added `SLACK_VERIFICATION_TOKEN` to setup docs.

## Remaining Recommendations

- Add a `tests/` style lightweight validation script for CSV headers and sheet schema drift checks.
- Add idempotency key handling for duplicate `/submit` retries from Slack.
- Add role-based guardrails for admin-only commands like `/report`.
