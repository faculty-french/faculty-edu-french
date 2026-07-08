export default function InfoBox({ title, sections = [] }) {
  return (
    <div className="info-box">
      {title && <h4 className="info-box__title">{title}</h4>}
      {sections.map((section, i) => (
        <div key={i} className="info-box__section">
          {section.heading && <h5 className="info-box__heading">{section.heading}</h5>}
          {Array.isArray(section.items) && section.items.length > 0 && (
            <ul className="info-box__items">
              {section.items.map((item, j) => (
                <li key={j} className="info-box__item">{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
