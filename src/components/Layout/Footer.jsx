import { useState, useEffect, useRef } from 'react';
import { useHighlighter } from '../../context/HighlighterContext';
import { useAdmin } from '../../context/AdminContext';
import AdminLogin from '../Admin/AdminLogin';

const PHASES = [1, 2, 3, 4];

export default function Footer({ currentPage, totalPages, phase, onPrev, onNext, onGoToPage }) {
  const { isHighlightMode, toggleHighlightMode, undo, canUndo } = useHighlighter();
  const { isAdmin, logout } = useAdmin();
  const [loginOpen, setLoginOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('book_theme') || 'light';
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const isCancelling = useRef(false);
  const hasCommitted = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('book_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const commit = () => {
    if (isCancelling.current || hasCommitted.current) return;
    hasCommitted.current = true;
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      onGoToPage(n - 1);
    }
    setEditing(false);
  };

  return (
    <footer className="book-footer">
      <button
        className="book-footer__btn"
        onClick={onPrev}
        disabled={currentPage <= 0}
        id="btn-prev-page"
      >
        ‹ Précédent
      </button>

      <div className="book-footer__center">
        {editing ? (
          <div className="book-footer__input-wrapper">
            <input
              className="book-footer__goto-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={draft}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                if (cleaned.length <= 3) {
                  setDraft(cleaned);
                }
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commit();
                } else if (e.key === 'Escape') {
                  isCancelling.current = true;
                  setEditing(false);
                }
              }}
              onBlur={commit}
            />
            <span className="book-footer__page-counter"> / {totalPages}</span>
          </div>
        ) : (
          <button
            type="button"
            className="book-footer__page-counter book-footer__page-counter--btn"
            id="btn-goto-page"
            title="Aller à la page…"
            aria-label="Aller à une page précise"
            onClick={() => {
              isCancelling.current = false;
              hasCommitted.current = false;
              setEditing(true);
              setDraft(String(currentPage + 1));
            }}
          >
            {currentPage + 1} / {totalPages}
          </button>
        )}
        {phase > 0 && (
          <div className="progress-rail" aria-hidden="true">
            {PHASES.map((p) => (
              <span
                key={p}
                className={`progress-rail__dot progress-rail__dot--${p} ${p === phase ? 'progress-rail__dot--active' : ''}`}
              />
            ))}
          </div>
        )}
      </div>

      <button
        className="book-footer__btn"
        onClick={onNext}
        disabled={currentPage >= totalPages - 1}
        id="btn-next-page"
      >
        Suivant ›
      </button>
      <button
        type="button"
        className={`highlight-toggle ${isHighlightMode ? 'highlight-toggle--active' : ''}`}
        onClick={toggleHighlightMode}
        aria-label="Surligneur"
        id="btn-highlight-toggle"
        title="Surligneur"
      >
        🖍️
      </button>
      {/* Only offered while surligneur mode is on — it undoes highlighting, nothing else. */}
      {isHighlightMode && (
        <button
          type="button"
          className="highlight-undo"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Annuler le dernier surlignage"
          id="btn-highlight-undo"
          title="Annuler le dernier surlignage"
        >
          ↩️
        </button>
      )}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Changer le thème"
        id="btn-theme-toggle"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      <button
        type="button"
        className={`admin-toggle ${isAdmin ? 'admin-toggle--active' : ''}`}
        id="btn-admin-toggle"
        title={isAdmin ? 'Quitter le mode administrateur' : 'Mode administrateur'}
        aria-label={isAdmin ? 'Quitter le mode administrateur' : 'Mode administrateur'}
        onClick={() => (isAdmin ? logout() : setLoginOpen(true))}
      >
        ⚙️
      </button>
      {loginOpen && <AdminLogin onClose={() => setLoginOpen(false)} />}
    </footer>
  );
}
