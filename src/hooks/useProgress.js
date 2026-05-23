import { useState, useEffect, useCallback } from 'react';

export function useProgress() {
  const [progress, setProgress] = useState({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('book_progress');
      if (stored) setProgress(JSON.parse(stored));
    } catch { setProgress({}); }
  }, []);

  const saveProgress = useCallback((data) => {
    try {
      localStorage.setItem('book_progress', JSON.stringify(data));
    } catch (e) { console.error('Failed to save progress:', e); }
  }, []);

  const updateLessonStatus = useCallback((lessonId, status) => {
    setProgress(prev => {
      const updated = { ...prev, [lessonId]: status };
      saveProgress(updated);
      return updated;
    });
  }, [saveProgress]);

  const getLessonStatus = useCallback((lessonId) => {
    return progress[lessonId] || 'not_started';
  }, [progress]);

  const setCurrentPage = useCallback((lessonId, pageIndex) => {
    try {
      localStorage.setItem(`book_current_page_${lessonId}`, String(pageIndex));
    } catch {}
  }, []);

  const getCurrentPage = useCallback((lessonId) => {
    try {
      const page = localStorage.getItem(`book_current_page_${lessonId}`);
      return page ? parseInt(page, 10) : 0;
    } catch { return 0; }
  }, []);

  return { progress, updateLessonStatus, getLessonStatus, setCurrentPage, getCurrentPage };
}
