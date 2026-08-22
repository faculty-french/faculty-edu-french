import { useRef } from 'react';
import { PRINT_REQUEST_EVENT } from '../../context/PrintContext';

export default function BookCover({
  eyebrow,
  title,
  subtitle,
  modules = [],
  author,
  credential,
  year,
  welcome,
}) {
  // page-flip preventDefaults touchstart on the sheet, so the compatibility click
  // never fires on phones — the button opens on pointerup, like the mind-map branches.
  const pressRef = useRef(null);
  const stop = (e) => e.stopPropagation();
  const requestPrint = () => window.dispatchEvent(new CustomEvent(PRINT_REQUEST_EVENT));

  return (
    <div className="book-cover">
      {/* Decorative vertical spectrum spine on the left edge */}
      <div className="book-cover__spectrum" aria-hidden="true">
        <div className="book-cover__spectrum-segment book-cover__spectrum--1" />
        <div className="book-cover__spectrum-segment book-cover__spectrum--2" />
        <div className="book-cover__spectrum-segment book-cover__spectrum--3" />
        <div className="book-cover__spectrum-segment book-cover__spectrum--4" />
      </div>

      {/* Elegant dual-line keyline frame */}
      <div className="book-cover__frame">
        <div className="book-cover__inner-frame">
          
          {/* Header Area */}
          <div className="book-cover__head">
            <img className="book-cover__logo book-cover__logo--left" src="minia_logo.png" alt="Université de Minia" />
            <img className="book-cover__logo book-cover__logo--right" src="faculty_logo.png" alt="Faculté de Pédagogie" />
            {eyebrow && <p className="book-cover__eyebrow">{eyebrow}</p>}
            {title && <h1 className="book-cover__title">{title}</h1>}
            {subtitle && <p className="book-cover__subtitle">{subtitle}</p>}
            
            {/* Elegant Divider Ornament */}
            <div className="book-cover__divider" aria-hidden="true">
              <span className="book-cover__divider-diamond">◆</span>
            </div>
          </div>

          {/* Cover artwork (author's design) — replaces the modules list */}
          <div className="book-cover__body book-cover__body--art">
            <img
              className="book-cover__art"
              src="cover-art.jpg"
              alt="Livre ouvert avec stylo plume devant la faculté — Apprendre, écrire, communiquer… construire l'avenir"
            />
          </div>

          {/* Footer Area */}
          <div className="book-cover__foot">
            {welcome && (
              <div className="book-cover__welcome-box">
                <p className="book-cover__welcome">{welcome}</p>
              </div>
            )}
            
            <div className="book-cover__credit">
              <div className="book-cover__divider-thin" aria-hidden="true" />
              {author && <p className="book-cover__author">{author}</p>}
              {(credential || year) && (
                <p className="book-cover__meta">
                  {[credential, year].filter(Boolean).join(' · ')}
                </p>
              )}
              {/* French & Egyptian flag emblems */}
              <div className="book-cover__emblems" aria-hidden="true">
                <div className="book-cover__french-emblem">
                  <span className="emblem-blue" />
                  <span className="emblem-white" />
                  <span className="emblem-red" />
                </div>
                <img className="book-cover__egyptian-flag" src="flag-egypt.svg" alt="Drapeau de l'Égypte" />
              </div>
            </div>
          </div>

        </div>
      </div>

      <button
        type="button"
        id="btn-print-cover"
        className="book-cover__print"
        title="Imprimer le livret (PDF)"
        onPointerDown={(e) => { stop(e); pressRef.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          stop(e);
          const press = pressRef.current;
          pressRef.current = null;
          if (!press) return;
          if (Math.abs(e.clientX - press.x) > 12 || Math.abs(e.clientY - press.y) > 12) return;
          requestPrint();
        }}
        onPointerCancel={() => { pressRef.current = null; }}
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={(e) => { stop(e); requestPrint(); }}
      >
        🖨️ Imprimer le livret
      </button>
    </div>
  );
}

