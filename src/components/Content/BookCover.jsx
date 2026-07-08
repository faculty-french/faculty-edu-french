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
            {eyebrow && <p className="book-cover__eyebrow">{eyebrow}</p>}
            {title && <h1 className="book-cover__title">{title}</h1>}
            {subtitle && <p className="book-cover__subtitle">{subtitle}</p>}
            
            {/* Elegant Divider Ornament */}
            <div className="book-cover__divider" aria-hidden="true">
              <span className="book-cover__divider-diamond">◆</span>
            </div>
          </div>

          {/* Modules/Sommaire Preview */}
          {modules.length > 0 && (
            <div className="book-cover__body">
              <div className="book-cover__section-title">Sommaire du Programme</div>
              <ol className="book-cover__modules">
                {modules.map((m, i) => (
                  <li key={m.num || i} className={`cover-module cover-module--phase-${i + 1}`}>
                    <span className="cover-module__num-wrapper">
                      <span className="cover-module__num">{m.num}</span>
                    </span>
                    <span className="cover-module__title">{m.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

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
              {/* French flag CSS emblem in the center */}
              <div className="book-cover__french-emblem" aria-hidden="true">
                <span className="emblem-blue" />
                <span className="emblem-white" />
                <span className="emblem-red" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

