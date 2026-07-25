import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '../../context/AdminContext';
import { extractEditableFields, applyEdits } from '../../utils/adminFields';

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
export default function PageEditor({ page, onClose }) {
  const { saveLesson } = useAdmin();
  const [phase, setPhase] = useState('loading'); // loading | ready | saving | done | error
  const [message, setMessage] = useState('');
  const [lesson, setLesson] = useState(null);
  const [edits, setEdits] = useState({}); // JSON.stringify(path) -> new value
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
        setLesson(data);
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

  const fields = useMemo(
    () => (lesson ? extractEditableFields(lesson, page.sourceIndex) : []),
    [lesson, page.sourceIndex]
  );

  const dirtyCount = Object.keys(edits).length;

  const setField = (field, value) => {
    const key = JSON.stringify(field.path);
    setEdits((prev) => {
      const next = { ...prev };
      if (value === field.value) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const handleSave = async () => {
    if (!lesson || dirtyCount === 0 || phase === 'saving') return;
    setPhase('saving');
    setMessage('');
    try {
      const updated = applyEdits(lesson, edits);
      await saveLesson(page.sourceFile, updated);
      storeOverride(page.sourceFile, updated);
      setPhase('done');
      // Reload so the book re-renders from the override; the admin session
      // (sessionStorage) survives the reload.
      setTimeout(() => window.location.reload(), 1600);
    } catch (err) {
      setPhase('ready');
      setMessage(err.message || 'La publication a échoué.');
    }
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
    if (fields.length === 0) return <p className="admin-editor__status">Aucun texte modifiable sur cette page.</p>;
    return fields.map((field) => {
      const key = JSON.stringify(field.path);
      const value = key in edits ? edits[key] : field.value;
      const changed = key in edits;
      return (
        <div key={field.id} className={`admin-field${changed ? ' admin-field--changed' : ''}`}>
          <label className="admin-field__label" htmlFor={`admin-${field.id}`}>{field.label}</label>
          {field.kind === 'select' ? (
            <select
              id={`admin-${field.id}`}
              className="admin-field__input"
              value={value}
              onChange={(e) => setField(field, e.target.value)}
            >
              {field.choices.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          ) : field.kind === 'short' ? (
            <input
              id={`admin-${field.id}`}
              type="text"
              className="admin-field__input"
              value={value}
              onChange={(e) => setField(field, e.target.value)}
            />
          ) : (
            <textarea
              id={`admin-${field.id}`}
              className="admin-field__input admin-field__textarea"
              rows={Math.min(8, Math.max(2, Math.ceil(value.length / 55)))}
              value={value}
              onChange={(e) => setField(field, e.target.value)}
            />
          )}
        </div>
      );
    });
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
          {body()}
        </div>
        <div className="admin-card__footer">
          <span className="admin-editor__count">
            {dirtyCount > 0 ? `${dirtyCount} champ(s) modifié(s)` : 'Aucune modification'}
          </span>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>Annuler</button>
          <button
            type="button"
            id="admin-submit-edits"
            className="admin-btn admin-btn--primary"
            disabled={phase !== 'ready' || dirtyCount === 0}
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
