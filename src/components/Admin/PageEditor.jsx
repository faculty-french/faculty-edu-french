import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '../../context/AdminContext';
import {
  extractPageBlocks,
  setFieldValue,
  reorderBlock,
  moveBlockToPage,
  movablePageTargets,
} from '../../utils/adminFields';

const OVERRIDES_KEY = 'book_admin_overrides';

function storeOverride(path, lesson) {
  try {
    const all = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
    all[path] = { savedAt: Date.now(), lesson };
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
  } catch { /* storage full — the CDN copy will still arrive within minutes */ }
}

// Full-screen editor for one book page. Loads the CURRENT lesson JSON straight
// from the server (cache-busted) rather than trusting the in-memory book, so an
// edit made from another device minutes ago is not silently overwritten.
//
// State is a single draft lesson: text edits and block moves both produce a new
// draft, which is why they compose in any order — no stored edit can go stale
// against a move that happened after it.
export default function PageEditor({ page, onClose }) {
  const { saveLesson } = useAdmin();
  const [phase, setPhase] = useState('loading'); // loading | ready | saving | done | error
  const [message, setMessage] = useState('');
  const [original, setOriginal] = useState(null);
  const [draft, setDraft] = useState(null);
  const [moved, setMoved] = useState([]); // human-readable log of structural changes
  const stopEvent = (e) => e.stopPropagation();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${base}content/${page.sourceFile}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setOriginal(data);
        setDraft(data);
        setPhase('ready');
      } catch {
        if (alive) {
          setPhase('error');
          setMessage('Impossible de charger la leçon. Vérifiez votre connexion et réessayez.');
        }
      }
    })();
    return () => { alive = false; };
  }, [page]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const blocks = useMemo(
    () => (draft ? extractPageBlocks(draft, page.sourceIndex) : []),
    [draft, page.sourceIndex]
  );
  const targets = useMemo(
    () => (draft ? movablePageTargets(draft, page.sourceIndex, page.pageNumber) : []),
    [draft, page.sourceIndex, page.pageNumber]
  );

  const dirty = !!draft && !!original && JSON.stringify(draft) !== JSON.stringify(original);

  const handleMoveToPage = (blockIndex, label, toIndex) => {
    setDraft((d) => moveBlockToPage(d, page.sourceIndex, blockIndex, toIndex));
    const target = targets.find((t) => t.index === toIndex);
    setMoved((m) => [...m, `${label} → ${target ? target.label : 'autre page'}`]);
  };

  const handleSave = async () => {
    if (!draft || !dirty || phase === 'saving') return;
    setPhase('saving');
    setMessage('');
    try {
      await saveLesson(page.sourceFile, draft);
      storeOverride(page.sourceFile, draft);
      setPhase('done');
      // Reload so the book re-renders from the override; the admin session
      // (sessionStorage) survives the reload.
      setTimeout(() => window.location.reload(), 1600);
    } catch (err) {
      setPhase('ready');
      setMessage(err.message || 'La publication a échoué.');
    }
  };

  const renderField = (field) => {
    const value = field.value;
    const common = {
      id: `admin-${field.id}`,
      className: 'admin-field__input',
      value,
      onChange: (e) => setDraft((d) => setFieldValue(d, field.path, e.target.value)),
    };
    return (
      <div key={field.id} className="admin-field">
        <label className="admin-field__label" htmlFor={common.id}>{field.label}</label>
        {field.kind === 'select' ? (
          <select {...common}>
            {field.choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        ) : field.kind === 'short' ? (
          <input type="text" {...common} />
        ) : (
          <textarea
            {...common}
            className="admin-field__input admin-field__textarea"
            rows={Math.min(8, Math.max(2, Math.ceil(value.length / 55)))}
          />
        )}
      </div>
    );
  };

  const body = () => {
    if (phase === 'loading') return <p className="admin-editor__status">Chargement de la leçon…</p>;
    if (phase === 'error') return <p className="admin-error" role="alert">{message}</p>;
    if (phase === 'done') {
      return (
        <p className="admin-editor__status admin-editor__status--ok" id="admin-save-ok">
          ✅ Modifications publiées ! Elles seront visibles pour tous les lecteurs d'ici quelques minutes.
        </p>
      );
    }
    if (blocks.length === 0) return <p className="admin-editor__status">Cette page ne contient aucun bloc.</p>;
    return blocks.map((block) => (
      <div key={`${block.index}-${block.type}-${block.label}`} className="admin-block" data-block-type={block.type}>
        <div className="admin-block__bar">
          <span className="admin-block__name">{block.index + 1}. {block.label}</span>
          <div className="admin-block__actions">
            <button
              type="button"
              className="admin-block__btn"
              title="Monter dans la page"
              aria-label={`Monter ${block.label}`}
              disabled={block.index === 0}
              onClick={() => setDraft((d) => reorderBlock(d, page.sourceIndex, block.index, -1))}
            >
              ↑
            </button>
            <button
              type="button"
              className="admin-block__btn"
              title="Descendre dans la page"
              aria-label={`Descendre ${block.label}`}
              disabled={block.index === blocks.length - 1}
              onClick={() => setDraft((d) => reorderBlock(d, page.sourceIndex, block.index, 1))}
            >
              ↓
            </button>
            <select
              className="admin-block__move"
              aria-label={`Déplacer ${block.label} vers une autre page`}
              value=""
              onChange={(e) => {
                if (e.target.value === '') return;
                handleMoveToPage(block.index, block.label, Number(e.target.value));
              }}
            >
              <option value="">Déplacer vers…</option>
              {targets.map((t) => (
                <option key={t.index} value={t.index}>{t.label} ({t.blocks} blocs)</option>
              ))}
            </select>
          </div>
        </div>
        {block.fields.length > 0
          ? block.fields.map(renderField)
          : <p className="admin-block__empty">Aucun texte modifiable dans ce bloc.</p>}
      </div>
    ));
  };

  return createPortal(
    <div
      className="admin-overlay"
      onPointerDown={stopEvent}
      onMouseDown={stopEvent}
      onTouchStart={stopEvent}
    >
      <div className="admin-card admin-card--editor" role="dialog" aria-modal="true" aria-label="Modifier la page">
        <div className="admin-card__header">
          <h3>✏️ Modifier la page {page.pageNumber ? `${page.pageNumber}` : ''} — {page.title}</h3>
          <button type="button" className="admin-card__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="admin-card__body admin-card__body--scroll">
          {message && phase !== 'error' && <p className="admin-error" role="alert">{message}</p>}
          {moved.length > 0 && phase !== 'done' && (
            <div className="admin-moves" id="admin-moves">
              <strong>Blocs déplacés :</strong>
              <ul>{moved.map((m, i) => <li key={i}>{m}</li>)}</ul>
              <span className="admin-moves__warn">
                Vérifiez la page d'arrivée après publication : une page trop chargée est signalée en rouge.
              </span>
            </div>
          )}
          {body()}
        </div>
        <div className="admin-card__footer">
          <span className="admin-editor__count">
            {dirty ? 'Modifications non publiées' : 'Aucune modification'}
          </span>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>Annuler</button>
          <button
            type="button"
            id="admin-submit-edits"
            className="admin-btn admin-btn--primary"
            disabled={phase !== 'ready' || !dirty}
            onClick={handleSave}
          >
            {phase === 'saving' ? 'Publication…' : 'Soumettre les modifications'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
