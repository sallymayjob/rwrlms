# Code Review Notes

This review focuses on correctness and deployability of the Apps Script + Sheets implementation.

## Findings Addressed

1. **Request verification could fail in Apps Script deployments**
   - Issue: relying only on `X-Slack-*` headers can fail when Apps Script web apps do not expose headers.
   - Fix: `verifySlackRequest` now uses signature verification when headers are present, and falls back to Slack verification token validation (`payload.token`) otherwise.

2. **Course lesson filtering was a no-op**
   - Issue: `getLessonsForCourse(courseId)` previously ignored course/module boundaries.
   - Fix: added module mapping (`Modules` sheet) and filtered lessons by `Lessons.Module` values belonging to the selected course.

3. **Module-based progression**
   - Issue: learner pacing was lesson-pointer based and not module-based.
   - Fix: learner state now uses `CurrentModule`; `/learn` and submission updates progress module-by-module.

4. **Dashboard formula column references were stale**
   - Issue: formulas pointed to wrong columns after schema updates.
   - Fix: updated formulas:
     - `ActiveCourses`: `Courses!I2:I` (Status)
     - `ActiveLessons`: `Lessons!G2:G` (Status)

## Remaining Recommendations

- Add a lightweight validation script for CSV header/schema drift checks.
- Add idempotency key handling for duplicate `/submit` retries from Slack.
- Add role-based guardrails for admin-only commands like `/report`.
