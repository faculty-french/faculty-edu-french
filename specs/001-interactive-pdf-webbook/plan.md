# Implementation Plan: Interactive PDF-to-Web Book Platform

**Branch**: `001-interactive-pdf-webbook` | **Date**: 2026-05-07 | **Spec**: [spec.md](spec.md)

## Summary

Convert a French-language PDF textbook into an interactive, mobile-first web book platform with realistic page-turning animations (react-pageflip). Built with React + Vite, deployed on GitHub Pages.

## Technical Context

**Language/Version**: JavaScript (ES2020+), JSX, CSS3  
**Framework**: React 18+ with Vite  
**Primary Dependencies**: `react-pageflip`, `react-router-dom`  
**Storage**: Browser localStorage  
**Target Platform**: Mobile-first web (GitHub Pages)  
**Project Type**: SPA with client-side routing  
**Scale/Scope**: ~564 pages, 4 units, 12 lessons, 1 Telegram bot

## Project Structure

```text
book-onlin/
├── public/
│   ├── content/                  # JSON lesson data (runtime-fetched)
│   │   └── unit{1-4}/lessonN.json
│   └── images/                   # Book images (covers, lessons, icons)
├── src/
│   ├── components/
│   │   ├── Layout/               # Header, Footer, NamePrompt
│   │   ├── Content/              # ReadingPassage, ObjectivesBox, VocabHighlight, VideoPlayer
│   │   ├── Interactive/          # MCQ, VraiFaux, FillBlank, Matching, OpenEnded, SubmitButton
│   │   ├── Progress/             # ProgressBar, LessonStatus
│   │   └── Book/                 # BookViewer (pageflip), PageContent, PageNavigation
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Lesson.jsx
│   │   └── sections/             # Standalone section pages per lesson
│   ├── hooks/                    # useAnswers, useProgress, useSubmission
│   ├── services/                 # telegram.js, contentLoader.js
│   ├── config/config.js          # Telegram credentials, book metadata
│   ├── styles/                   # index.css, book.css, questions.css, responsive.css
│   ├── App.jsx
│   └── main.jsx
├── videos/                       # Thumbnails + external video URL catalog
├── index.html
├── package.json
└── vite.config.js
```
