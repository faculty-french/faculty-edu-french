# Tasks: Interactive PDF-to-Web Book Platform

**Status**: In Progress — Phase 1 Setup

## Phase 1: Setup ✅ IN PROGRESS

- [x] T001 Initialize Vite + React project
- [x] T002 Install dependencies: react-pageflip, react-router-dom
- [ ] T003 [P] Create directory structure for components, hooks, services, config, styles
- [ ] T004 [P] Create directory structure for public/content, public/images, videos
- [ ] T005 [P] Create Telegram config at src/config/config.js
- [ ] T006 [P] Configure Vite for GitHub Pages in vite.config.js
- [ ] T007 Remove default Vite boilerplate, create clean app shell

## Phase 2: Foundational

- [ ] T008 [P] Create design system CSS at src/styles/index.css
- [ ] T009 [P] Create book viewer CSS at src/styles/book.css
- [ ] T010 [P] Create question CSS at src/styles/questions.css
- [ ] T011 [P] Create responsive CSS at src/styles/responsive.css
- [ ] T012 Set up React Router in src/App.jsx
- [ ] T013 [P] Implement contentLoader service at src/services/contentLoader.js
- [ ] T014 [P] Implement useAnswers hook at src/hooks/useAnswers.js
- [ ] T015 [P] Implement useProgress hook at src/hooks/useProgress.js
- [ ] T016 [P] Create utils at src/services/utils.js
- [ ] T017 Create NamePrompt component at src/components/Layout/NamePrompt.jsx

## Phase 3: US1 — Book Navigation (P1) 🎯 MVP

- [ ] T018 [US1] Create PageContent component at src/components/Book/PageContent.jsx
- [ ] T019 [P] [US1] Create ReadingPassage at src/components/Content/ReadingPassage.jsx
- [ ] T020 [P] [US1] Create ObjectivesBox at src/components/Content/ObjectivesBox.jsx
- [ ] T021 [P] [US1] Create VocabHighlight at src/components/Content/VocabHighlight.jsx
- [ ] T022 [US1] Create BookViewer with react-pageflip at src/components/Book/BookViewer.jsx
- [ ] T023 [US1] Create PageNavigation at src/components/Book/PageNavigation.jsx
- [ ] T024 [US1] Create Header at src/components/Layout/Header.jsx
- [ ] T025 [US1] Create Footer at src/components/Layout/Footer.jsx
- [ ] T026 [US1] Implement Lesson page at src/pages/Lesson.jsx
- [ ] T027 [US1] Implement Home page at src/pages/Home.jsx
- [ ] T028 [US1] Create sample lesson1.json at public/content/unit1/lesson1.json
- [ ] T029 [US1] Wire up App.jsx: styles, Router, NamePrompt

## Phase 4: US2 — Interactive Questions (P1)

- [ ] T030 [P] [US2] Create OpenEnded at src/components/Interactive/OpenEnded.jsx
- [ ] T031 [P] [US2] Create MCQ at src/components/Interactive/MCQ.jsx
- [ ] T032 [P] [US2] Create VraiFaux at src/components/Interactive/VraiFaux.jsx
- [ ] T033 [P] [US2] Create FillBlank at src/components/Interactive/FillBlank.jsx
- [ ] T034 [P] [US2] Create Matching at src/components/Interactive/Matching.jsx
- [ ] T035 [US2] Create QuestionRenderer at src/components/Interactive/QuestionRenderer.jsx
- [ ] T036 [US2] Integrate QuestionRenderer into PageContent
- [ ] T037 [US2] Add question pages to sample lesson1.json

## Phase 5: US3 — Telegram Submission (P1)

- [ ] T038 [US3] Implement telegram.js at src/services/telegram.js
- [ ] T039 [US3] Implement useSubmission hook at src/hooks/useSubmission.js
- [ ] T040 [US3] Create SubmitButton at src/components/Interactive/SubmitButton.jsx
- [ ] T041 [US3] Create ValidationNotification at src/components/Interactive/ValidationNotification.jsx
- [ ] T042 [US3] Create SubmissionConfirmation at src/components/Interactive/SubmissionConfirmation.jsx
- [ ] T043 [US3] Integrate submission flow into Lesson page
- [ ] T044 [US3] Mark lesson as submitted in localStorage

## Phase 6: US4 — Video Pages (P2)

- [ ] T045 [P] [US4] Create VideoPlayer at src/components/Content/VideoPlayer.jsx
- [ ] T046 [US4] Integrate VideoPlayer into PageContent
- [ ] T047 [US4] Add video page to sample lesson1.json
- [ ] T048 [US4] Create videos/README.md catalog

## Phase 7: US5 — Responsive Design (P1)

- [ ] T049 [US5] Responsive BookViewer sizing (single vs two-page spread)
- [ ] T050 [US5] Touch target sizing (44×44px minimum)
- [ ] T051 [US5] Swipe gesture refinement
- [ ] T052 [US5] Typography across breakpoints
- [ ] T053 [US5] Viewport meta tag and PWA settings in index.html

## Phase 8: Section Pages

- [ ] T054–T060 Section page template + routes + links from book

## Phase 9: Polish

- [ ] T061–T069 French audit, dark mode, progress bars, loading states, build validation
