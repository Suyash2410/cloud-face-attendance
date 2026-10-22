# Antigravity Build Prompt: Haazri, Cloud Face Attendance System

*How to use: paste this whole document into Antigravity as the first prompt, or save it as `PROJECT_BRIEF.md` in an empty workspace and tell the agent: "Read PROJECT\_BRIEF.md fully and build the project it describes, following the build order in Section 6."*

---

## 0. Instructions to the agent

You are a senior full-stack and cloud engineer plus a product designer. Build **Haazri**, a cloud-based face attendance system for colleges, end to end, from the PRD (Section 1), TRD (Section 2) and design spec (Section 3) below.

Working rules:

1. **Plan first.** Before writing code, produce an implementation plan artifact listing the folder structure, the phases from Section 6 and any assumptions. Then build phase by phase.
2. **Everything must actually work.** No placeholder screens, no fake buttons, no `TODO` stubs. Every feature in Section 1 must be reachable in the UI and functional.
3. **Two run modes.** The app must run in **Mock Mode** (no AWS account needed: a local mock API with in-memory/JSON data and simulated face matching) and in **Live Mode** (real AWS). Switch with one env variable, `VITE_USE_MOCK=true|false`. Mock Mode must ship with rich seed data so every chart looks alive on first launch.
4. **Verify your own work.** Run the app, open it in the browser, click through every flow, and capture screenshots. Fix visual bugs, console errors and broken flows before you report done.
5. **Do not make it look AI-generated.** Follow Section 3 strictly. Reject the usual defaults: purple-to-blue gradients, generic glassmorphism cards, stock "Welcome back 👋" copy, emoji used as icons, lorem ipsum, symmetrical three-card hero rows, and the default shadcn/Tailwind look.
6. **Deliver** a clean repo with a `README.md` (setup, Mock Mode, Live Mode deployment, screenshots), `.env.example`, a seed script, and an architecture diagram in Mermaid inside the README.

---

## 1. PRD: Product Requirements Document

### 1.1 Overview

**Haazri** (from the Hindi/Urdu word for attendance) lets a teacher mark attendance for a whole class by taking one or two photos. The system detects every face, matches each against enrolled students using **AWS Rekognition**, and records attendance in the cloud. Teachers review and confirm the result, admins manage students and classes, and everyone gets analytics.

### 1.2 Problem

Manual roll calls waste 5 to 10 minutes per lecture, allow proxy attendance, and produce paper records that are hard to analyse. Existing biometric devices are costly and need hardware at every classroom.

### 1.3 Goals

- Mark attendance for 60+ students from a single photo in under 15 seconds.
- Reduce proxy attendance through face matching and a duplicate-photo check.
- Give instant, visual insight into attendance trends and defaulters.
- Run entirely on serverless AWS services, within the free tier for a demo-scale college.

### 1.4 Non-goals

No mobile native app, no hardware integration, no payroll or LMS integration, no continuous video surveillance. This is photo-based attendance only.

### 1.5 Users and roles

| Role | Who | What they need |
| --- | --- | --- |
| **Admin** | Department head or exam cell | Manage teachers, classes, students and enrollment; global analytics; settings; audit log |
| **Teacher** | Faculty member | Take attendance, review and correct results, view their own classes' reports, export data |
| **Student** | Enrolled student | View own attendance per subject, percentage, and shortage warning (read-only) |

### 1.6 Features and acceptance criteria

**F1. Authentication and roles**

- Email and password sign-in using Amazon Cognito (Live Mode) or a mock auth (Mock Mode), with three role-based dashboards.
- Role guards on every route and API endpoint. A student cannot reach teacher or admin pages.
- Acceptance: wrong password shows a clear inline error; session persists on refresh; sign-out clears the session.

**F2. Student management (Admin)**

- Create, edit, deactivate and delete students: name, roll number, division, year, email, photo.
- Bulk import from CSV with a validation preview showing row-level errors.
- Search, filter by division, sort, and paginate.
- Acceptance: duplicate roll numbers are rejected; deleting a student also deletes their face data from Rekognition and S3.

**F3. Face enrollment**

- Capture 3 to 5 photos per student by webcam (with an on-screen face guide oval and quality hints such as "too dark" or "face turned") or by file upload.
- Reject poor photos using Rekognition `DetectFaces` quality checks (brightness, sharpness, pose, exactly one face).
- Mandatory consent checkbox with plain-language text before enrolling.
- Each accepted photo is indexed with `IndexFaces` into the college's Rekognition collection, with `ExternalImageId` equal to the roll number.
- Acceptance: enrollment status badge per student (Not enrolled, Partial, Enrolled); re-enroll and remove-face options.

**F4. Classes and subjects**

- Admin creates classes (subject, division, year) and assigns teachers and students.
- Teachers see only their assigned classes.

**F5. Take attendance (core feature)**

- Teacher picks class and lecture slot, then uploads 1 to 3 photos or captures from the webcam.
- Processing screen shows an animated scan-line over the photo and live steps: Uploading, Detecting faces, Matching, Done.
- Result screen shows the photo with **animated bounding boxes** over each face: green for matched with name and confidence, amber for low confidence (below the review threshold), red for unknown face.
- Side panel lists Present, Absent and Needs review, with one-click actions: confirm, change to present or absent, assign an unknown face to a student.
- Multiple photos of the same session are merged (a student counts as present if matched in any photo).
- Teacher presses **Confirm and Save** to finalize. Saved sessions can be edited within a configurable window (default 24 hours).
- Acceptance: matched threshold configurable (default 90%), review band (default 80 to 90%); a student can never be marked present twice for the same session.

**F6. Anti-proxy checks**

- Reject a photo whose perceptual hash matches a previously used photo for another session (duplicate-photo detection).
- Flag a student matched in two different classes at overlapping times.
- Optional stretch: Rekognition Face Liveness for enrollment.

**F7. Manual attendance override**

- Teacher can mark or change any student's status manually with a mandatory reason. Every override is stored with method `manual`.

**F8. Dashboards and analytics**

- *Admin dashboard:* total students, enrolled percentage, today's overall attendance, active classes, plus the charts below.
- *Teacher dashboard:* today's lectures, pending reviews, class-wise averages, defaulter list.
- *Student dashboard:* per-subject attendance percentage rings, a calendar heatmap, and a "classes you can still miss" calculator based on the 75% rule.
- Required charts (all animated, interactive tooltips):
  - Line or area chart: daily attendance trend (last 30 days), with toggle for subject.
  - **Donut/pie chart:** Present vs Absent vs Manual split.
  - Grouped bar chart: subject-wise attendance comparison across divisions.
  - Calendar heatmap: attendance intensity per day.
  - Radial gauges or progress rings: individual student percentage per subject.
  - Histogram: distribution of match confidence scores (shows system accuracy).
  - Ranked bar list: top 10 defaulters.

**F9. Reports and export**

- Filter by class, date range, student, status. Export to CSV and a print-ready PDF report (with college header and charts).
- Acceptance: exported numbers match on-screen numbers exactly.

**F10. Alerts**

- Automatically email students and the class teacher when attendance falls below the threshold (default 75%) using Amazon SES (Live Mode; logged to console in Mock Mode). Weekly digest toggle.
- In-app notification bell with unread count.

**F11. Settings and privacy (Admin)**

- Configure thresholds, attendance edit window, shortage percentage, data retention (auto-delete class photos after N days via an S3 lifecycle rule), and college name and logo.
- "Delete my face data" request flow for students; admin can purge any student.
- Audit log: who did what and when (logins, overrides, deletions, exports), searchable.

### 1.7 Key user flows

1. **Enroll:** Admin, Students, Add, Capture photos, Consent, Quality check passes, Indexed, Badge turns Enrolled.
2. **Attendance:** Teacher, Take attendance, Choose class, Upload photos, Processing, Review boxes, Fix exceptions, Confirm, Dashboard updates.
3. **Student check:** Student signs in, sees rings and heatmap, sees warning if below 75%.

### 1.8 Success metrics

Match accuracy of 95% or higher on well-lit frontal photos, end-to-end processing under 15 seconds for 60 faces, zero unauthorized cross-role access, and Lighthouse performance 85 or higher on desktop.

---

## 2. TRD: Technical Requirements Document

### 2.1 Architecture

```
Browser (React SPA)
   |  HTTPS + JWT (Cognito)
   v
CloudFront --> S3 (static frontend)
API Gateway (HTTP API) --> Lambda functions (Python 3.12)
                               |-- Rekognition (collection, DetectFaces, SearchFacesByImage)
                               |-- S3 (student photos, class photos; presigned URLs)
                               |-- DynamoDB (students, classes, sessions, attendance, audit)
                               |-- SES (alert emails)
EventBridge (daily schedule) --> Lambda (shortage alerts, digest)
CloudWatch (logs, metrics, alarms)
```

### 2.2 Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | React 18 + Vite + TypeScript | SPA, react-router |
| Styling | Tailwind CSS with a custom theme (Section 3 tokens) | Do not ship default colors |
| Animation | Framer Motion | Page, list, number and box-reveal animations |
| Charts | Recharts (or Apache ECharts for the heatmap) | Animated, themed |
| State and data | TanStack Query + Zustand | Caching and light global state |
| Forms | React Hook Form + Zod | Validation |
| Webcam | `react-webcam` or native `getUserMedia` | Enrollment and capture |
| Icons | Lucide, used consistently with a single stroke width | No emoji icons |
| Backend | AWS Lambda (Python 3.12), boto3, Pillow (Lambda layer) | One function per route group |
| API | API Gateway HTTP API with JWT authorizer | Cognito user pool |
| Auth | Amazon Cognito with groups `admin`, `teacher`, `student` |  |
| Face AI | Amazon Rekognition | Collection `haazri-faces` |
| Database | DynamoDB (on-demand) | See 2.3 |
| Object storage | S3 (two buckets: `photos`, `web`) | Private; presigned URLs |
| Email | Amazon SES | Sandbox is fine for demo |
| Scheduler | EventBridge Scheduler | Daily alert job |
| IaC and deploy | AWS SAM (`template.yaml`) | `sam build && sam deploy --guided` |
| Mock Mode | Node (Express) or MSW mock API + JSON seed | Mirrors the real API contract exactly |
| Testing | Vitest and React Testing Library; pytest with `moto` for Lambda |  |

### 2.3 Data model (DynamoDB)

- **Students**: PK `studentId` (roll no). Attrs: name, email, division, year, status, enrollmentState, faceIds\[\], photoKeys\[\], consentAt, createdAt.
- **Classes**: PK `classId`. Attrs: subject, division, year, teacherId, studentIds\[\], schedule.
- **Sessions**: PK `classId`, SK `date#slot`. Attrs: sessionId, photoKeys\[\], photoHashes\[\], status (processing, review, confirmed), stats, createdBy, confirmedAt.
- **Attendance**: PK `sessionId`, SK `studentId`. Attrs: status (present, absent, manual), confidence, method (face, manual), reason, markedBy, markedAt. GSI on `studentId` + `date` for student history.
- **Users**: PK `userId` (Cognito sub). Attrs: role, name, email, linkedStudentId.
- **AuditLog**: PK `date`, SK `timestamp#id`. Attrs: actor, action, target, meta.
- **Settings**: single item `global`.

### 2.4 Face recognition pipeline (Lambda `process_session`)

1. Client requests presigned PUT URLs, uploads class photos directly to S3.
2. Client calls `POST /sessions/{id}/process`. Lambda fetches each image.
3. Compute a perceptual hash (imagehash or a simple dHash). Reject duplicates (F6).
4. `DetectFaces` returns every face (up to 100) with bounding boxes. `SearchFacesByImage` only searches the *largest* face in an image, so **crop each detected face** (with about 20% padding) using Pillow, then call `SearchFacesByImage` per crop with `FaceMatchThreshold=80` and `MaxFaces=1`.
5. Classify: confidence at or above the match threshold becomes **matched**; between review threshold and match threshold becomes **needs review**; no match becomes **unknown**.
6. Restrict matches to students of the selected class (ignore matches outside the roster, but log them).
7. Run `asyncio` or a thread pool to process crops in parallel and stay under the Lambda timeout (set 60s, 1024 MB).
8. Write results to the Attendance table with status `review`, return normalized bounding boxes (0 to 1) so the frontend can draw them at any size.

### 2.5 API (REST, JSON, JWT required)

```
POST   /auth/*                      (handled by Cognito)
GET    /me
GET/POST/PUT/DELETE  /students      /students/{id}
POST   /students/import             (CSV)
POST   /students/{id}/photos/presign
POST   /students/{id}/enroll        (DetectFaces quality gate + IndexFaces)
DELETE /students/{id}/faces         (DeleteFaces + purge photos)
GET/POST/PUT/DELETE  /classes       /classes/{id}
POST   /sessions                    (create, returns presigned URLs)
POST   /sessions/{id}/process
GET    /sessions/{id}               (boxes, matches, review list)
PATCH  /sessions/{id}/attendance/{studentId}   (override with reason)
POST   /sessions/{id}/assign-face   (assign unknown face to a student)
POST   /sessions/{id}/confirm
GET    /analytics/overview | /trend | /subjects | /heatmap | /defaulters | /confidence
GET    /reports/export?format=csv|pdf&...
GET/PUT /settings
GET    /audit
GET    /notifications
```

The Mock Mode server must implement the identical contract.

### 2.6 Security requirements

- Least-privilege IAM per Lambda (only the Rekognition collection, tables and buckets it needs).
- S3 buckets private, block public access, SSE-S3 encryption, presigned URLs expiring in 5 minutes, CORS restricted to the app origin.
- DynamoDB encrypted at rest; no secrets in the frontend; `.env.example` only.
- Server-side role checks in every Lambda (never trust the client).
- Input validation with Pydantic; rate limiting at API Gateway.
- Store consent timestamp; support face-data deletion (DeleteFaces plus S3 delete).
- S3 lifecycle rule to expire class photos after the configured retention period.

### 2.7 Non-functional requirements

- Responsive from 360px mobile to 1920px desktop (teachers will use phones to capture).
- Accessible: keyboard navigation, visible focus states, WCAG AA contrast, alt text, and `prefers-reduced-motion` support that disables non-essential animation.
- Error handling: every network call has loading, empty and error states with helpful copy and retry.
- Observability: structured JSON logs, CloudWatch alarm on Lambda errors.
- Cost guardrails: document estimated monthly cost at 500 students and 6 sessions a day.

### 2.8 Suggested repository structure

```
haazri/
  frontend/        (src/pages, components, charts, hooks, api, mock, styles)
  backend/         (functions/{students,classes,sessions,analytics,reports,alerts}, layers/)
  mock-server/     (Express app and seed data)
  infra/           (template.yaml, samconfig.toml)
  scripts/         (seed.py, import_sample.csv)
  docs/            (architecture.md, screenshots/)
  README.md
```

---

## 3. Design specification (read carefully)

The product must feel hand-designed by a small studio, not generated. It should look like a confident, slightly editorial campus tool.

### 3.1 Visual identity

- **Mood:** warm, confident, Indian-campus, modern editorial. Think printed college diary meets clean data dashboard.
- **Light theme (default):** paper background `#F5F0E6`, surface `#FFFBF3`, ink text `#1B1A17`, muted text `#6B655A`, hairline borders `#E3DBC9`.
- **Accent colors:** marigold `#E8A317` (primary action), deep teal `#0F5C5A` (success and primary charts), brick `#B5412A` (absent and alerts), indigo ink `#2B3A67` (secondary data). Use them sparingly and consistently: teal means present, brick means absent, marigold means needs review.
- **Dark theme:** ink background `#12110F`, surface `#1C1A17`, same accents lightened for contrast. Provide a theme toggle that remembers the choice.
- **Typography:** headings in a characterful serif (Fraunces or Instrument Serif), body in DM Sans or Geist, all numbers and IDs in JetBrains Mono. Large, confident numerals for KPIs.
- **Shape and depth:** slightly squared corners (6 to 8px), 1px hairline borders instead of heavy shadows, occasional offset "print" shadows on key cards. No frosted-glass blur, no neon glows.
- **Layout:** asymmetric, editorial grids. A fixed left rail with a custom wordmark, wide content area, varied card sizes (a large hero chart beside a tall defaulter list, not three equal cards). Generous whitespace.
- **Iconography and imagery:** one consistent line-icon set. A custom SVG logo for Haazri (a stylised face outline that doubles as a checkmark). Subtle paper-grain texture overlay at 3% opacity on the background.
- **Copy:** specific and human. Examples: "38 of 41 present in TE-C Cloud Computing", "3 faces need your eyes", "Nobody is short on attendance this week". Never "Welcome back!" or lorem ipsum. Use realistic Indian names and divisions in seed data.

### 3.2 Animation and interaction

Animations should explain state, not decorate. Keep durations between 200 and 600 ms with ease-out curves, and honour reduced-motion.

- Page transitions with a short fade and 8px upward slide; staggered entrance for cards and table rows.
- KPI numbers count up on first view.
- Charts draw in: lines stroke-animate, donut segments sweep, bars grow from the baseline, heatmap cells fade in diagonally.
- Hover on a chart element highlights it and dims the rest; tooltips show exact values.
- Take-attendance flow: a vertical **scan-line sweep** across the uploaded photo while processing, then bounding boxes **pop in one by one** with a small spring, name labels sliding out beside them.
- Clicking a face box focuses the matching student row (and vice versa) with a synchronized highlight.
- Attendance rings animate to their value; the 75% threshold marker is always visible on them.
- Skeleton loaders shaped like the real content; toast notifications that slide in from the bottom-right.
- Meaningful empty states with a small custom illustration and one clear action.

### 3.3 Screens to build

1. **Sign in:** split layout, left side an editorial panel with a large serif tagline and a looping subtle animation of face boxes on a classroom silhouette; right side the form.
2. **Admin dashboard:** KPI strip, hero attendance trend (area chart), donut for status split, subject bar chart, calendar heatmap, defaulter list, recent activity.
3. **Students:** data table with enrollment badges, filters, CSV import dialog, student detail drawer.
4. **Enrollment studio:** webcam panel with face guide oval, live quality hints, thumbnail strip of captured photos, consent step.
5. **Classes:** class cards plus roster management.
6. **Take attendance:** stepper (Class, Photos, Processing, Review, Confirm) with the annotated photo and review side panel.
7. **Session history and detail:** list with filters, detail view that reuses the annotated photo.
8. **Reports:** filter bar, live preview table, export buttons.
9. **Student portal:** rings per subject, heatmap, "bunk calculator", shortage banner.
10. **Settings, Audit log, Notifications.**

---

## 4. Seed data for Mock Mode

Generate 120 students across divisions TE-A, TE-B and TE-C with realistic Indian names, 6 subjects, 3 teachers, and 60 days of attendance history with believable patterns (lower attendance on Mondays and Fridays, a handful of chronic defaulters, an exam-week dip). For simulated face matching in Mock Mode, use bundled sample class photos with pre-defined face boxes and match results (including two low-confidence faces and one unknown face) so the full review flow can be demonstrated offline. Provide a "Reset demo data" button in Settings.

---

## 5. Definition of done (acceptance checklist)

- [ ] Mock Mode runs with `npm install && npm run dev` and shows populated dashboards with no AWS account.
- [ ] Live Mode deploys with `sam deploy` and the frontend with a documented `npm run build` plus S3 sync step.
- [ ] All three roles work with correct permissions.
- [ ] Enrollment quality-gates bad photos and indexes good ones.
- [ ] Take attendance works end to end: upload, detect, crop, match, review, confirm, appears in analytics.
- [ ] All seven chart types render, animate and show tooltips; donut/pie chart present on the dashboard.
- [ ] CSV and PDF exports match on-screen data.
- [ ] Shortage alert job runs (email in Live Mode, console log in Mock Mode).
- [ ] Light and dark themes both look polished; layout holds at 360px, 768px and 1440px widths.
- [ ] No console errors; no placeholder text; no default component-library look.
- [ ] README includes setup, architecture diagram, cost estimate, privacy notes and screenshots.
- [ ] Unit tests pass for the match-classification logic and API permission checks.

---

## 6. Build order

1. **Foundation:** repo scaffold, design tokens, fonts, theme toggle, layout shell, routing, mock server and seed data.
2. **Auth and roles:** sign in, role guards, three dashboards' shells.
3. **Students and enrollment:** CRUD, CSV import, enrollment studio.
4. **Classes.**
5. **Take attendance:** upload, processing animation, annotated review screen, confirm.
6. **Analytics:** all charts wired to data, animations polished.
7. **Reports and alerts:** exports, notifications, shortage job.
8. **Settings, audit log, privacy tools.**
9. **AWS backend (Live Mode):** SAM template, Lambdas, Rekognition pipeline, Cognito, deploy scripts. Keep the API contract identical to the mock server.
10. **Polish and verification:** responsive pass, accessibility pass, reduced-motion pass, browser-test every flow, capture screenshots, finalize README.

When finished, report what was built, what was verified in the browser, any known limitations, and the exact commands to run both modes.
