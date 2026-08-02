import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePrintMode } from '../../context/PrintContext';

// The four branches orbit the central node. Geometry is measured rather than
// hard-coded so the ellipse always fits the sheet: the pills must never cross the
// edges of the canvas (the sheet clips at 420x640 and must not scroll) and must
// clear the central node as they pass above and below it.
const CANVAS_H = 240;
const PILL_W = 132;
const PILL_H = 46;
const CENTER_D = 80;
const ORBIT_SECONDS = 18;

// Motion path support (Safari got it in 16). Without it the pills fall back to a
// static ring, which is why their placement is a transform on top of a real layout.
const SUPPORTS_MOTION_PATH =
  typeof CSS !== 'undefined' && CSS.supports?.('offset-path', 'path("M 0 0 L 1 1")');

// A circle, not an ellipse: offset-distance advances by arc length, so only on a
// circle do four pills started a quarter apart stay a quarter apart — on an ellipse
// they bunch up at the flat ends and overlap each other.
function circlePath(cx, cy, r) {
  return `path("M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}")`;
}

export default function MindMap({ id, center, caption, hint, branches = [] }) {
  // On paper the orbit is frozen wherever the animation happened to be, which puts
  // the pills at arbitrary — sometimes overlapping — angles. Print the static ring.
  const printMode = usePrintMode();
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

  const slots = branches.slice(0, 4);

  // Measured orbit geometry (the sheet is a fixed CSS box, but the width still
  // depends on the page padding, so it is read from the DOM rather than assumed).
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cx = width / 2;
  const cy = CANVAS_H / 2;
  // The largest circle that keeps a whole pill inside the canvas, horizontally and
  // vertically. A quarter turn apart, two pills are then r apart vertically, which
  // is well over a pill's height — they never cover each other.
  const r = Math.max(60, Math.min(cx - PILL_W / 2 - 6, CANVAS_H / 2 - PILL_H / 2 - 4));
  const orbitReady = width > 0 && SUPPORTS_MOTION_PATH && !printMode;

  return (
    <div className="mind-map" onPointerDown={stopEvent} onMouseDown={stopEvent} onTouchStart={stopEvent}>
      <div
        ref={canvasRef}
        className={`mind-map__canvas${orbitReady ? ' mind-map__canvas--orbit' : ''}`}
        style={activeBranch ? { '--orbit-play': 'paused' } : undefined}
      >
        {orbitReady && (
          <div
            className="mind-map__ring"
            aria-hidden="true"
            style={{ left: cx - r, top: cy - r, width: r * 2, height: r * 2 }}
          />
        )}

        <div className="mind-map__grid">
          {slots.map((branch, i) => {
            const count = filledCount(branch);
            const total = branch.items?.length || 0;
            return (
              <button
                key={branch.id}
                type="button"
                className={`mind-map__branch mind-map__branch--${branch.tone}`}
                style={
                  orbitReady
                    ? {
                        offsetPath: circlePath(cx, cy, r),
                        // Evenly spaced on the ellipse: a negative delay starts the
                        // animation part-way through instead of bunching them up.
                        animationDelay: `${-(i / slots.length) * ORBIT_SECONDS}s`,
                      }
                    : { gridArea: ['1 / 1 / 2 / 2', '1 / 3 / 2 / 4', '2 / 1 / 3 / 2', '2 / 3 / 3 / 4'][i] }
                }
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

          <div
            className="mind-map__center"
            style={orbitReady ? undefined : { gridArea: '1 / 2 / 3 / 3' }}
          >
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
