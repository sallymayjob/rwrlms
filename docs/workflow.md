# Workflow

## Learner Journey

1. User runs `/onboard`.
2. User runs `/courses` to inspect options.
3. User runs `/enroll COURSE_ID`.
4. User runs `/learn` to receive the current lesson.
5. User runs `/submit LESSON_ID complete`.
6. Progress is updated and learners advance through lessons inside the active module, then to the next module.
7. User checks `/progress`, `/gaps`, and `/cert` as needed.

## Lesson Delivery Flow

```text
/learn
  -> find Learner by UserID
  -> resolve CurrentModule
  -> fetch Lesson row
  -> format Slack micro-lesson
  -> return ephemeral response
```

## Submission Flow

```text
/submit M03-W02-L04 complete
  -> validate format + lesson existence
  -> append Submissions row
  -> increment learner progress
  -> keep learner in current module until all module lessons are done
  -> advance CurrentModule to next module when applicable
  -> return confirmation
```

## Admin / Ops Flow

- `/report` gives snapshot totals.
- Scheduled triggers:
  - `sendDailyLesson()`
  - `weeklyLeaderboard()`
  - `progressReport()`
- CSV refresh via `importLessonsCSV()` for content updates.
