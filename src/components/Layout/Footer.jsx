import { useState, useEffect } from 'react';

const PHASES = [1, 2, 3, 4];

export default function Footer({ currentPage, totalPages, phase, onPrev, onNext }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('book_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('book_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

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
        <span className="book-footer__page-counter">
          {currentPage + 1} / {totalPages}
        </span>
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
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Changer le thème"
        id="btn-theme-toggle"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </footer>
  );
}
