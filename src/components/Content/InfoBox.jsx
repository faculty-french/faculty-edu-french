import { escapeHtml } from '../../utils/highlightUtils';

// Title, section headings and list items are each addressed separately ("5.t", "5.s0h",
// "5.s0i2", …) so a highlight maps to one leaf instead of the whole box. The text is
// escaped before injection because it used to render as plain React children: escaping
// keeps the output identical and leaves textContent — what offsets measure — unchanged.
export default function InfoBox({ title, sections = [], hideTitle = false, blockKey, hl }) {
  const keyed = blockKey != null;
  const mark = (key, text) => (hl ? hl(key, escapeHtml(text)) : escapeHtml(text));

  return (
    <div className="info-box">
      {title && !hideTitle && (
        <h4
          className="info-box__title"
          data-block-index={keyed ? `${blockKey}.t` : undefined}
          dangerouslySetInnerHTML={{ __html: mark(`${blockKey}.t`, title) }}
        />
      )}
      {sections.map((section, i) => (
        <div key={i} className="info-box__section">
          {section.heading && (
            <h5
              className="info-box__heading"
              data-block-index={keyed ? `${blockKey}.s${i}h` : undefined}
              dangerouslySetInnerHTML={{ __html: mark(`${blockKey}.s${i}h`, section.heading) }}
            />
          )}
          {Array.isArray(section.items) && section.items.length > 0 && (
            <ul className="info-box__items">
              {section.items.map((item, j) => (
                <li
                  key={j}
                  className="info-box__item"
                  data-block-index={keyed ? `${blockKey}.s${i}i${j}` : undefined}
                  dangerouslySetInnerHTML={{ __html: mark(`${blockKey}.s${i}i${j}`, item) }}
                />
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
