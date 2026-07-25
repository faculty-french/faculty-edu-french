import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { mergeRanges } from '../utils/highlightUtils';

const HIGHLIGHTS_STORAGE_KEY = 'book_highlights';
const MAX_HISTORY = 30;

// A highlight is addressed by page id + block key + character range. The block key is a
// STRING, not a number: composite blocks (objectives, info-box, keywords) expose one key
// per text leaf — "5.t", "5.i0", "5.s0h" — because a single key for the whole box would
// measure offsets against its labels and numbering too. Ranges saved before this change
// stored a plain number, which still compares equal once both sides are stringified.
const sameBlock = (a, b) => String(a) === String(b);

const HighlighterContext = createContext({
  isHighlightMode: false,
  toggleHighlightMode: () => {},
  highlights: {},
  addHighlights: () => {},
  removeHighlight: () => {},
  clearPageHighlights: () => {},
  undo: () => {},
  canUndo: false
});

function readStored() {
  try {
    const stored = localStorage.getItem(HIGHLIGHTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function persist(state) {
  try {
    localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — the in-memory state still works for this session */
  }
}

export function HighlighterProvider({ children }) {
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [highlights, setHighlights] = useState(readStored);
  const [history, setHistory] = useState([]);

  // Mirrors `highlights` so updates can be computed outside the state updater. Doing the
  // work there would run twice under StrictMode and push duplicate history entries.
  const highlightsRef = useRef(highlights);
  useEffect(() => { highlightsRef.current = highlights; }, [highlights]);

  useEffect(() => {
    document.body.dataset.highlight = isHighlightMode ? 'on' : 'off';
  }, [isHighlightMode]);

  const toggleHighlightMode = useCallback(() => {
    setIsHighlightMode(prev => !prev);
  }, []);

  const commit = useCallback((next) => {
    const previous = highlightsRef.current;
    setHistory(h => [...h.slice(-(MAX_HISTORY - 1)), previous]);
    highlightsRef.current = next;
    setHighlights(next);
    persist(next);
  }, []);

  const addHighlights = useCallback((pageId, newRanges) => {
    if (!pageId || !Array.isArray(newRanges) || newRanges.length === 0) return;
    const prev = highlightsRef.current;
    let updatedPage = [...(prev[pageId] || [])];

    const byBlock = new Map();
    newRanges.forEach(r => {
      if (r && r.block != null && typeof r.start === 'number' && typeof r.end === 'number' && r.start < r.end) {
        const key = String(r.block);
        if (!byBlock.has(key)) byBlock.set(key, []);
        byBlock.get(key).push({ ...r, block: key });
      }
    });
    if (byBlock.size === 0) return;

    byBlock.forEach((ranges, key) => {
      const others = updatedPage.filter(r => !sameBlock(r.block, key));
      const mine = updatedPage.filter(r => sameBlock(r.block, key));
      const merged = mergeRanges([...mine, ...ranges]).map(r => ({ ...r, block: key }));
      updatedPage = [...others, ...merged];
    });

    commit({ ...prev, [pageId]: updatedPage });
  }, [commit]);

  const removeHighlight = useCallback((pageId, blockKey, start, end) => {
    if (!pageId || blockKey == null) return;
    const prev = highlightsRef.current;
    const pageHighlights = prev[pageId] || [];
    const filtered = pageHighlights.filter(r => {
      if (!sameBlock(r.block, blockKey)) return true;
      if (r.start === start && r.end === end) return false;
      if (start >= r.start && end <= r.end) return false;
      return true;
    });
    if (filtered.length === pageHighlights.length) return;
    commit({ ...prev, [pageId]: filtered });
  }, [commit]);

  const clearPageHighlights = useCallback((pageId) => {
    if (!pageId) return;
    const prev = highlightsRef.current;
    if (!prev[pageId] || prev[pageId].length === 0) return;
    const next = { ...prev };
    delete next[pageId];
    commit(next);
  }, [commit]);

  // Steps back through the highlights made in this session, most recent first.
  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1];
      highlightsRef.current = previous;
      setHighlights(previous);
      persist(previous);
      return h.slice(0, -1);
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
        clearPageHighlights,
        undo,
        canUndo: history.length > 0
      }}
    >
      {children}
    </HighlighterContext.Provider>
  );
}

export function useHighlighter() {
  return useContext(HighlighterContext);
}
