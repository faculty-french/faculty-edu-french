// Accepts two item shapes for backward compatibility with un-migrated files:
//   - legacy: plain strings like "01\nComprendre l'idée générale…"
//   - new schema: { num: "01", text: "Comprendre l'idée générale…" }
function normalizeItem(item) {
  if (item && typeof item === 'object') {
    return { num: item.num || '', text: item.text || '' };
  }
  if (typeof item === 'string') {
    const [first, ...rest] = item.split('\n');
    if (rest.length > 0) {
      return { num: first, text: rest.join('\n') };
    }
    return { num: '', text: item };
  }
  return { num: '', text: '' };
}

// Each text leaf carries its own data-block-index ("5.t", "5.i0", …). One key on the
// wrapper would measure highlight offsets against the box's numbering as well, shifting
// every range. `hl` returns a leaf's HTML with its stored highlights already applied.
export default function ObjectivesBox({ title, items, blockKey, hl }) {
  const normalized = (items || []).map(normalizeItem);
  const keyed = blockKey != null;
  const mark = (key, html) => (hl ? hl(key, html) : html);
  const titleKey = `${blockKey}.t`;

  return (
    <div className="objectives-box">
      <h3
        className="objectives-box__title"
        data-block-index={keyed ? titleKey : undefined}
        dangerouslySetInnerHTML={{ __html: mark(titleKey, title || 'Objectifs de cette leçon') }}
      />
      <ul className="objectives-box__list">
        {normalized.map((item, i) => (
          <li key={i} className="objectives-box__item">
            {item.num && <span className="objectives-box__num">{item.num}</span>}
            <span
              className="objectives-box__text"
              data-block-index={keyed ? `${blockKey}.i${i}` : undefined}
              dangerouslySetInnerHTML={{ __html: mark(`${blockKey}.i${i}`, item.text) }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
