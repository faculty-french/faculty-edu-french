export default function LessonIntro({ lessonLabel, title, tagline, keywords = [], illustration, accent, accentSoft }) {
  const numMatch = lessonLabel ? lessonLabel.match(/\d+/) : null;
  const num = numMatch ? numMatch[0] : '';

  return (
    <div className="lesson-intro" style={{ '--intro-accent': accent, '--intro-accent-soft': accentSoft }}>
      <div className="lesson-intro__frame">
        <div className="lesson-intro__inner">
          {num && <span className="lesson-intro__watermark" aria-hidden="true">{num}</span>}

          <div className="lesson-intro__head">
            <span className="lesson-intro__eyebrow">{lessonLabel}</span>
            <div className="lesson-intro__divider" aria-hidden="true">
              <span className="lesson-intro__divider-line" />
              <span className="lesson-intro__divider-diamond">◆</span>
              <span className="lesson-intro__divider-line" />
            </div>
            <h2 className="lesson-intro__title">{title}</h2>
          </div>

          <div className="lesson-intro__art" dangerouslySetInnerHTML={{ __html: illustration }} />

          <div className="lesson-intro__foot">
            <p className="lesson-intro__tagline">{tagline}</p>
            {keywords.length > 0 && (
              <ul className="lesson-intro__keywords">
                {keywords.map((k, i) => (
                  <li key={i} className="lesson-intro__kw">{k}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
