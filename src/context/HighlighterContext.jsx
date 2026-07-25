import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mergeRanges } from '../utils/highlightUtils';

const HIGHLIGHTS_STORAGE_KEY = 'book_highlights';

const HighlighterContext = createContext({
  isHighlightMode: false,
  toggleHighlightMode: () => {},
  highlights: {},
  addHighlights: () => {},
  removeHighlight: () => {},
  clearPageHighlights: () => {}
});

export function HighlighterProvider({ children }) {
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [highlights, setHighlights] = useState(() => {
    try {
      const stored = localStorage.getItem(HIGHLIGHTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    document.body.dataset.highlight = isHighlightMode ? 'on' : 'off';
  }, [isHighlightMode]);

  const toggleHighlightMode = useCallback(() => {
    setIsHighlightMode(prev => !prev);
  }, []);

  const addHighlights = useCallback((pageId, newRanges) => {
    if (!pageId || !Array.isArray(newRanges) || newRanges.length === 0) return;
    setHighlights(prev => {
      const pageHighlights = prev[pageId] || [];
      let updatedPage = [...pageHighlights];

      const byBlock = {};
      newRanges.forEach(r => {
        if (typeof r.block === 'number' && typeof r.start === 'number' && typeof r.end === 'number' && r.start < r.end) {
          if (!byBlock[r.block]) byBlock[r.block] = [];
          byBlock[r.block].push(r);
        }
      });

      Object.keys(byBlock).forEach(blockKey => {
        const blockIndex = Number(blockKey);
        const thisBlockRanges = updatedPage.filter(r => r.block === blockIndex);
        const otherBlockRanges = updatedPage.filter(r => r.block !== blockIndex);

        const merged = mergeRanges([...thisBlockRanges, ...byBlock[blockIndex]]);
        updatedPage = [...otherBlockRanges, ...merged];
      });

      const nextState = {
        ...prev,
        [pageId]: updatedPage
      };
      try {
        localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {}
      return nextState;
    });
  }, []);

  const removeHighlight = useCallback((pageId, blockIndex, start, end) => {
    if (!pageId || typeof blockIndex !== 'number') return;
    setHighlights(prev => {
      const pageHighlights = prev[pageId] || [];
      const filtered = pageHighlights.filter(r => {
        if (r.block !== blockIndex) return true;
        if (r.start === start && r.end === end) return false;
        if (start >= r.start && end <= r.end) return false;
        return true;
      });

      const nextState = {
        ...prev,
        [pageId]: filtered
      };
      try {
        localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {}
      return nextState;
    });
  }, []);

  const clearPageHighlights = useCallback((pageId) => {
    if (!pageId) return;
    setHighlights(prev => {
      const nextState = { ...prev };
      delete nextState[pageId];
      try {
        localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {}
      return nextState;
    });
  }, []);

  return (
    <HighlighterContext.Provider
      value={{
        isHighlightMode,
        toggleHighlightMode,
        highlights,
        addHighlights,
        removeHighlight,
        clearPageHighlights
      }}
    >
      {children}
    </HighlighterContext.Provider>
  );
}

export function useHighlighter() {
  return useContext(HighlighterContext);
}
