import { useState, useEffect, useRef } from 'react';
import { useHighlighter } from '../../context/HighlighterContext';
import { useAdmin } from '../../context/AdminContext';
import AdminLogin from '../Admin/AdminLogin';

const PHASES = [1, 2, 3, 4];

// Inline icons rather than emoji: emoji render at different sizes and weights
// per platform, which is what made the row look mismatched.
const Icon = ({ path, filled = false }) => (
  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" focusable="false"
       fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const ICON_HIGHLIGHTER = (
  <>
    <path d="M15.5 4.5l4 4-8.5 8.5H7v-4z" />
    <path d="M4 20h7" />
  </>
);
const ICON_UNDO = (
  <>
    <path d="M4 9h11a4.5 4.5 0 0 1 0 9h-6" />
    <path d="M8 5L4 9l4 4" />
  </>
);
const ICON_MOON = <path d="M20 14.5A8 8 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />;
const ICON_SUN = (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
);
const ICON_GEAR = (
  <>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>
);

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
      {/* Left slot: admin only. The navigation stays optically centred whatever
          the two side groups contain, because the footer is a 1fr auto 1fr grid. */}
      <div className="book-footer__side book-footer__side--left">
        <button
          type="button"
          className={`footer-tool ${isAdmin ? 'footer-tool--active-admin' : ''}`}
          id="btn-admin-toggle"
          title={isAdmin ? 'Quitter le mode administrateur' : 'Mode administrateur'}
          aria-label={isAdmin ? 'Quitter le mode administrateur' : 'Mode administrateur'}
          aria-pressed={isAdmin}
          onClick={() => (isAdmin ? logout() : setLoginOpen(true))}
        >
          <Icon path={ICON_GEAR} />
        </button>
      </div>

      <div className="book-footer__nav">
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
      </div>

      <div className="book-footer__side book-footer__side--right">
        <button
          type="button"
          className={`footer-tool highlight-toggle ${isHighlightMode ? 'footer-tool--active-highlight' : ''}`}
          onClick={toggleHighlightMode}
          aria-label="Surligneur"
          aria-pressed={isHighlightMode}
          id="btn-highlight-toggle"
          title="Surligneur"
        >
          <Icon path={ICON_HIGHLIGHTER} />
        </button>
        {/* Only offered while surligneur mode is on — it undoes highlighting, nothing else. */}
        {isHighlightMode && (
          <button
            type="button"
            className="footer-tool highlight-undo"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Annuler le dernier surlignage"
            id="btn-highlight-undo"
            title="Annuler le dernier surlignage"
          >
            <Icon path={ICON_UNDO} />
          </button>
        )}
        <button
          type="button"
          className="footer-tool theme-toggle"
          onClick={toggleTheme}
          aria-label="Changer le thème"
          title="Changer le thème"
          id="btn-theme-toggle"
        >
          <Icon path={theme === 'light' ? ICON_MOON : ICON_SUN} />
        </button>
      </div>
      {loginOpen && <AdminLogin onClose={() => setLoginOpen(false)} />}
    </footer>
  );
}
