# Feature Specification: Interactive PDF-to-Web Book Platform

**Feature Branch**: `001-interactive-pdf-webbook`  
**Created**: 2026-05-07  
**Status**: Draft  
**Input**: User description: "Convert a regular PDF book into an interactive webpage with interactive questions, writable answer lines, multiple-choice questions, Telegram submission, validation, video pages, mobile-first design, and French-only interface."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reading and Navigating the Interactive Book (Priority: P1)

A student opens the web book on their phone and sees the book interface with realistic page-turning animations. They can navigate between pages using next/previous buttons, swiping, or clicking page edges. Each page displays the lesson content faithfully reproduced from the original PDF. The top of each page shows the current lesson title and the page number out of total pages.

**Why this priority**: Foundation of the entire platform.

**Independent Test**: Open on mobile, navigate through pages — content readable, page-flip smooth, header shows lesson title, footer shows page counter.

**Acceptance Scenarios**:

1. **Given** a student opens the web book on their phone, **When** the page loads, **Then** they see the book's introduction with a personalized greeting
2. **Given** a student is viewing a page, **When** they swipe or click the page edge, **Then** the next page appears with a realistic page-turning animation
3. **Given** a student clicks on text or an interactive element, **When** they click, **Then** it is NOT treated as a page flip
4. **Given** a student is viewing a lesson page, **When** they look at the header, **Then** they see the current lesson title in uppercase

---

### User Story 2 - Answering Interactive Questions (Priority: P1)

A student encounters questions: open-ended (typed text on lined input), multiple-choice, vrai/faux, fill-in-the-blank, and matching. Answers auto-save and persist across navigation.

**Why this priority**: Core pedagogical feature.

**Acceptance Scenarios**:

1. **Given** a student is on a question page, **When** they type/select, **Then** the answer is auto-saved
2. **Given** a student navigates away and returns, **Then** their answers are preserved

---

### User Story 3 - Submitting Answers via Telegram (Priority: P1)

At the end of each lesson, a submit button validates all questions are answered, then sends to a Telegram bot. Missing questions trigger a French notification.

**Why this priority**: Primary mechanism for teacher evaluation.

**Acceptance Scenarios**:

1. **Given** all questions answered, **When** submit tapped, **Then** answers sent to Telegram bot
2. **Given** questions missing, **When** submit tapped, **Then** French notification lists missing questions
3. **Given** network error, **Then** French error message + retry option

---

### User Story 4 - Watching Embedded Lesson Videos (Priority: P2)

Video pages embed YouTube/Vimeo players inline. Broken links show French fallback.

---

### User Story 5 - Responsive Mobile-First Experience (Priority: P1)

Single-page on mobile, two-page spread on desktop, 44×44px touch targets, no horizontal scrolling.

---

### Edge Cases

- Telegram bot unreachable → save locally + French error + retry
- Browser closed mid-lesson → localStorage preserves answers
- Whitespace-only answers → treated as unanswered
- Broken video links → French fallback message

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Display book content faithfully from PDF structure
- **FR-002**: Page-by-page navigation with page counter
- **FR-003**: Current lesson title in header
- **FR-004**: Open-ended questions with lined input areas
- **FR-005**: Multiple-choice questions with selectable options
- **FR-006**: Preserve answers when navigating between pages
- **FR-007**: Persist answers in localStorage across sessions
- **FR-008**: Submit button at end of each lesson
- **FR-009**: Validate all questions answered before submission
- **FR-010**: French notification for unanswered questions
- **FR-011**: Send answers to configured Telegram bot
- **FR-012**: French success confirmation after submission
- **FR-013**: French error message with retry on failure
- **FR-014**: Embedded video players (inline, no external redirect)
- **FR-015**: Entire interface in French only
- **FR-016**: Mobile-first responsive (single page mobile, two-page desktop)
- **FR-017**: Touch-friendly dimensions (44×44px minimum)
- **FR-018**: Personalized greeting ("Bonjour, [name]!")
- **FR-019**: Whitespace-only = unanswered
- **FR-020**: French fallback for unavailable videos

### Key Entities

- **Lesson**: Unit of learning with pages, questions, videos
- **Question**: Open-ended, MCQ, vrai/faux, fill-blank, matching
- **Student Answer**: Text or selection, stored locally per lesson
- **Submission**: Batch of answers sent to Telegram

## Success Criteria *(mandatory)*

- **SC-001**: Page transitions < 1 second
- **SC-002**: 95% students fill questions on first attempt
- **SC-003**: Telegram submission < 5 seconds on mobile
- **SC-004**: Usable on 360px+ screens, no horizontal scrolling
- **SC-005**: 100% answer recovery after browser refresh
- **SC-006**: 100% validation of unanswered/whitespace questions
- **SC-007**: All text in French, zero untranslated content
- **SC-008**: Videos play within 3 seconds
- **SC-009**: Two-page spread on 1024px+, single page below 768px

## Assumptions

- Students have modern smartphones with up-to-date browsers
- Stable internet connection for loading and submission
- Content manually structured from PDF into JSON
- Videos hosted externally (YouTube/Vimeo)
- Telegram bot pre-configured with credentials provided
- Book: 4 units, 12 lessons, ~564 pages
- Simple name entry for identification (no auth)
- French only — no i18n needed
