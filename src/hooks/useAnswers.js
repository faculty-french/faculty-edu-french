import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce, isBlankAnswer } from '../services/utils';

function getStorageKey(lessonId) {
  return `book_answers_${lessonId}`;
}

export function useAnswers(lessonId) {
  const [answers, setAnswers] = useState({});
  const answersRef = useRef({});

  // Load answers from localStorage on mount
  useEffect(() => {
    if (!lessonId) return;
    try {
      const stored = localStorage.getItem(getStorageKey(lessonId));
      if (stored) {
        const parsed = JSON.parse(stored);
        setAnswers(parsed);
        answersRef.current = parsed;
      } else {
        setAnswers({});
        answersRef.current = {};
      }
    } catch {
      setAnswers({});
      answersRef.current = {};
    }
  }, [lessonId]);

  // Save to localStorage (debounced)
  const saveToStorage = useCallback(
    debounce((lessonId, data) => {
      try {
        localStorage.setItem(getStorageKey(lessonId), JSON.stringify(data));
      } catch (e) { console.error('Failed to save answers:', e); }
    }, 500),
    []
  );

  const setAnswer = useCallback((questionId, value) => {
    const updatedAnswer = {
      questionId,
      value,
      timestamp: new Date().toISOString()
    };

    // Update ref synchronously
    answersRef.current = {
      ...answersRef.current,
      [questionId]: updatedAnswer
    };

    // Update state asynchronously
    setAnswers(prev => ({
      ...prev,
      [questionId]: updatedAnswer
    }));

    saveToStorage(lessonId, answersRef.current);
  }, [lessonId, saveToStorage]);

  const getAnswer = useCallback((questionId) => {
    return answers[questionId]?.value || '';
  }, [answers]);

  const validateAnswers = useCallback((questions) => {
    const missing = [];
    questions.forEach((q, idx) => {
      const answer = answersRef.current[q.id]?.value;
      if (isBlankAnswer(answer)) {
        missing.push({ questionId: q.id, index: idx + 1, text: q.text });
      }
    });
    return { isComplete: missing.length === 0, missing, answers: answersRef.current };
  }, []);

  // The unified book pools every lesson's answers under one storage key, so submission
  // state must be recorded per lesson explicitly — otherwise submitting one lesson marks
  // all twelve as already submitted.
  const markSubmitted = useCallback((submittedLessonId = lessonId) => {
    try {
      localStorage.setItem(`book_submission_${submittedLessonId}`, JSON.stringify({
        submitted: true, at: new Date().toISOString()
      }));
    } catch (e) { console.error('Failed to mark submitted:', e); }
  }, [lessonId]);

  const isSubmitted = useCallback((submittedLessonId = lessonId) => {
    try {
      const data = localStorage.getItem(`book_submission_${submittedLessonId}`);
      return data ? JSON.parse(data).submitted : false;
    } catch { return false; }
  }, [lessonId]);

  return { answers, setAnswer, getAnswer, validateAnswers, markSubmitted, isSubmitted };
}
