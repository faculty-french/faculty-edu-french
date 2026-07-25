import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const TONE_COLORS = {
  green: 'var(--phase-2)',
  red: 'var(--margin-red)',
  blue: 'var(--phase-1)',
  orange: 'var(--phase-3)',
};

// Four fixed slots around the central node: grid placement + the Bézier curve that
// links the centre of the canvas to that slot. The SVG uses a 0-100 viewBox with
// preserveAspectRatio="none", so the curves follow whatever size the canvas takes.
const SLOTS = [
  { gridArea: '1 / 1 / 2 / 2', path: 'M 50 50 C 40 50, 30 25, 22 25' },
  { gridArea: '1 / 3 / 2 / 4', path: 'M 50 50 C 60 50, 70 25, 78 25' },
  { gridArea: '2 / 1 / 3 / 2', path: 'M 50 50 C 40 75, 30 75, 22 75' },
  { gridArea: '2 / 3 / 3 / 4', path: 'M 50 50 C 60 75, 70 75, 78 75' },
];

export default function MindMap({ id, center, caption, hint, branches = [] }) {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(`book_mindmap_${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeBranchIndex, setActiveBranchIndex] = useState(null);
  const firstInputRef = useRef(null);
  const pressRef = useRef(null);

  // react-pageflip turns the page on any pointerdown/touchstart reaching the sheet.
  const stopEvent = (e) => e.stopPropagation();

  // page-flip listens for touchstart on .stf__block — a native listener that runs
  // BEFORE React's root-delegated handlers — and calls preventDefault() there, which
  // cancels the compatibility click on touch devices. So a branch cannot rely on
  // onClick alone: it opens on pointerup (a tap that started on the same button and
  // did not travel), and keeps onClick for mouse and keyboard activation.
  const startPress = (i) => (e) => {
    stopEvent(e);
    pressRef.current = { i, x: e.clientX, y: e.clientY };
  };
  const endPress = (i) => (e) => {
    stopEvent(e);
    const press = pressRef.current;
    pressRef.current = null;
    if (!press || press.i !== i) return;
    if (Math.abs(e.clientX - press.x) > 12 || Math.abs(e.clientY - press.y) > 12) return;
    setActiveBranchIndex(i);
  };

  const handleItemChange = (branchId, itemId, text) => {
    setData((prev) => {
      const key = `${branchId}.${itemId}`;
      const next = { ...prev };
      if (text.trim()) next[key] = text;
      else delete next[key];
      try {
        localStorage.setItem(`book_mindmap_${id}`, JSON.stringify(next));
      } catch { /* storage full or blocked — keep the in-memory value */ }
      return next;
    });
  };

  const activeBranch = activeBranchIndex !== null ? branches[activeBranchIndex] : null;

  useEffect(() => {
    if (activeBranchIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveBranchIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBranchIndex]);

  useEffect(() => {
    if (activeBranchIndex !== null && firstInputRef.current) {
      firstInputRef.current.focus({ preventScroll: true });
    }
  }, [activeBranchIndex]);

  const filledCount = (branch) =>
    (branch.items || []).reduce(
      (n, item) => (data[`${branch.id}.${item.id}`]?.trim() ? n + 1 : n),
      0
    );

  const slots = branches.slice(0, SLOTS.length);

  return (
    <div className="mind-map" onPointerDown={stopEvent} onMouseDown={stopEvent} onTouchStart={stopEvent}>
      <div className="mind-map__canvas">
        <svg className="mind-map__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {slots.map((branch, i) => (
            <path
              key={branch.id}
              d={SLOTS[i].path}
              stroke={TONE_COLORS[branch.tone] || 'var(--ink-soft)'}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div className="mind-map__grid">
          {slots.map((branch, i) => {
            const count = filledCount(branch);
            const total = branch.items?.length || 0;
            return (
              <button
                key={branch.id}
                type="button"
                className={`mind-map__branch mind-map__branch--${branch.tone}`}
                style={{ gridArea: SLOTS[i].gridArea }}
                onClick={(e) => {
                  stopEvent(e);
                  setActiveBranchIndex(i);
                }}
                onPointerDown={startPress(i)}
                onPointerUp={endPress(i)}
                onPointerCancel={() => { pressRef.current = null; }}
                onMouseDown={stopEvent}
                onTouchStart={stopEvent}
                aria-label={`${branch.label} — ${count} idée(s) sur ${total}`}
              >
                <span className="mind-map__branch-icon" aria-hidden="true">{branch.icon}</span>
                <span className="mind-map__branch-label">{branch.label}</span>
                <span className={`mind-map__badge${total > 0 && count === total ? ' mind-map__badge--full' : ''}`}>
                  {count}/{total}
                </span>
              </button>
            );
          })}

          <div className="mind-map__center" style={{ gridArea: '1 / 2 / 3 / 3' }}>
            <span className="mind-map__center-icon" role="img" aria-label="voiture">🚗</span>
            <span className="mind-map__center-label">{center}</span>
          </div>
        </div>
      </div>

      {caption && <div className="mind-map__caption">{caption}</div>}
      {hint && <div className="mind-map__hint">{hint}</div>}

      {/* The sheet is clipped and carries a 3D transform: a fixed-position panel must be
          portalled to document.body, otherwise it is laid out against the flipped page. */}
      {activeBranch && createPortal(
        <div
          className="mind-map-panel__backdrop"
          onClick={() => setActiveBranchIndex(null)}
          onPointerDown={stopEvent}
          onMouseDown={stopEvent}
          onTouchStart={stopEvent}
        >
          <div
            className={`mind-map-panel__card mind-map-panel__card--${activeBranch.tone}`}
            role="dialog"
            aria-modal="true"
            aria-label={activeBranch.label}
            onClick={stopEvent}
            onPointerDown={stopEvent}
            onMouseDown={stopEvent}
            onTouchStart={stopEvent}
          >
            <div className="mind-map-panel__header">
              <div className="mind-map-panel__title">
                <span className="mind-map-panel__icon" aria-hidden="true">{activeBranch.icon}</span>
                <h3>{activeBranch.label}</h3>
              </div>
              <button
                type="button"
                className="mind-map-panel__close"
                onClick={() => setActiveBranchIndex(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="mind-map-panel__body">
              {(activeBranch.items || []).map((item, idx) => {
                const value = data[`${activeBranch.id}.${item.id}`] || '';
                return (
                  <div key={item.id} className="mind-map-panel__field">
                    <label className="mind-map-panel__label" htmlFor={`mindmap-input-${item.id}`}>
                      {item.label}
                    </label>
                    <input
                      ref={idx === 0 ? firstInputRef : null}
                      id={`mindmap-input-${item.id}`}
                      type="text"
                      className={`mind-map-panel__input${value.trim() ? ' mind-map-panel__input--filled' : ''}`}
                      placeholder={item.example || 'Ajoute une idée…'}
                      value={value}
                      onChange={(e) => handleItemChange(activeBranch.id, item.id, e.target.value)}
                      autoComplete="off"
                      enterKeyHint="next"
                      maxLength={120}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mind-map-panel__footer">
              <div className="mind-map-panel__nav">
                <button
                  type="button"
                  className="mind-map-panel__nav-btn"
                  onClick={() => setActiveBranchIndex((prev) => (prev - 1 + branches.length) % branches.length)}
                >
                  ‹ Précédent
                </button>
                <button
                  type="button"
                  className="mind-map-panel__nav-btn"
                  onClick={() => setActiveBranchIndex((prev) => (prev + 1) % branches.length)}
                >
                  Suivant ›
                </button>
              </div>
              <button
                type="button"
                className="mind-map-panel__done-btn"
                onClick={() => setActiveBranchIndex(null)}
              >
                Terminé
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
