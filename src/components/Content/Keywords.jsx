import { escapeHtml } from '../../utils/highlightUtils';

// Title and each chip are addressed separately ("5.t", "5.c0", …) so a highlight maps to
// one leaf rather than to every chip concatenated. The text is escaped before injection
// because these values used to render as plain React children: escaping keeps the output
// identical and leaves textContent — what offsets are measured against — unchanged.
export default function Keywords({ title, items = [], blockKey, hl }) {
  const keyed = blockKey != null;
  const mark = (key, text) => (hl ? hl(key, escapeHtml(text)) : escapeHtml(text));

  return (
    <div className="keywords">
      {title && (
        <h4
          className="keywords__title"
          data-block-index={keyed ? `${blockKey}.t` : undefined}
          dangerouslySetInnerHTML={{ __html: mark(`${blockKey}.t`, title) }}
        />
      )}
      <div className="keywords__list">
        {items.map((item, i) => (
          <span
            key={i}
            className="keywords__chip"
            data-block-index={keyed ? `${blockKey}.c${i}` : undefined}
            dangerouslySetInnerHTML={{ __html: mark(`${blockKey}.c${i}`, item) }}
          />
        ))}
      </div>
    </div>
  );
}
