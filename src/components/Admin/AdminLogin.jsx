import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '../../context/AdminContext';

// Password prompt for admin mode. The password is verified by the relay Worker;
// nothing here knows or stores the expected value.
export default function AdminLogin({ onClose }) {
  const { login } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const stopEvent = (e) => e.stopPropagation();

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError('');
    try {
      await login(password);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="admin-overlay"
      onClick={onClose}
      onPointerDown={stopEvent}
      onMouseDown={stopEvent}
      onTouchStart={stopEvent}
    >
      <form className="admin-card admin-card--login" onClick={stopEvent} onSubmit={submit}>
        <div className="admin-card__header">
          <h3>🔐 Mode administrateur</h3>
          <button type="button" className="admin-card__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="admin-card__body">
          <label className="admin-field__label" htmlFor="admin-password">Mot de passe</label>
          <input
            ref={inputRef}
            id="admin-password"
            type="password"
            className="admin-field__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            enterKeyHint="go"
          />
          {error && <p className="admin-error" role="alert">{error}</p>}
        </div>
        <div className="admin-card__footer">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy || !password}>
            {busy ? 'Vérification…' : 'Se connecter'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
