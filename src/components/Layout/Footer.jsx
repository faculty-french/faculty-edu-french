import { useState, useEffect } from 'react';

export default function Footer({ currentPage, totalPages, onPrev, onNext }) {
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
      <span className="book-footer__page-counter">
        {currentPage + 1} / {totalPages}
      </span>
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
