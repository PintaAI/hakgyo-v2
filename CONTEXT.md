# Domain glossary

## Kurikulum

A course: the content (modules and items) learners study. `Course` in code. Students, staff and schedules belong to its classes, not to the curriculum.

## Kelas

A class: a group of students, with staff and an optional schedule, studying one curriculum. `Cohort` in code. A scheduled class has start and end dates and meetings.

## Kelas Mandiri

A curriculum's open-ended class for students who study on their own, without a schedule or end date. It is the course's default cohort (`Cohort.defaultForCourseId`), created on first use. New accounts join the Hangeul Mastery Kelas Mandiri.

## One class per curriculum

A student is in at most one of a running scheduled class or the Kelas Mandiri of a curriculum. Becoming active in a running scheduled class ends their Kelas Mandiri membership (auto move-out) and keeps their progress, which belongs to the student and the item. Joining the Kelas Mandiri is refused while they are in a running class of that curriculum.

## Assessment

A published set of questions that can be assigned as a course activity or used by an assessment event.

## Assessment event

A scheduled learner-facing occasion for taking an assessment. It controls participation, availability, duration, closing time, and leaderboard visibility.

## Attempt

One learner's answer session for an assessment. The latest attempt determines whether the learner sees details, resumes active work, or reviews a terminal result. An event may allow multiple attempts when its assessment's attempt limit permits them.

## Assessment details

The context screen shown before a learner's first attempt and after a terminal attempt. It owns assessment metadata, results, leaderboard state, and the action to start or re-attempt. It is skipped while an attempt is in progress.

## Learning recap

A learner-facing summary shown after a practice game. It highlights vocabulary that needs another review rather than collecting developer analytics.

## Review item

A vocabulary entry included in a learning recap because it reached the player or the learner mistyped its answer while targeting it. The same vocabulary appears only once even when both events occur.
