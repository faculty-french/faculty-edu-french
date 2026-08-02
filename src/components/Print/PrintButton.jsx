import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PrintBook from './PrintBook';
import { PRINT_REQUEST_EVENT } from '../../context/PrintContext';

const ICON_PRINTER = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9V3h12v6" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="7" rx="1" />
  </svg>
);

export default function PrintButton({ pages, questions, getAnswer }) {
  // idle -> options -> preparing -> printing -> idle
  const [stage, setStage] = useState('idle');
  const [includeAnswers, setIncludeAnswers] = useState(false);

  const openDialog = useCallback(() => setStage('options'), []);

  useEffect(() => {
    window.addEventListener(PRINT_REQUEST_EVENT, openDialog);
    return () => window.removeEventListener(PRINT_REQUEST_EVENT, openDialog);
  }, [openDialog]);

  const total = pages?.length || 0;
  const building = stage === 'preparing' || stage === 'printing';

  return (
    <>
      <button
        type="button"
        id="btn-print"
        className="print-trigger"
        onClick={openDialog}
        title="Imprimer le livret (PDF)"
        aria-label="Imprimer le livret"
      >
        {ICON_PRINTER}
        <span className="print-trigger__label">Imprimer</span>
      </button>

      {stage === 'options' && createPortal(
        <div className="print-dialog__backdrop" onClick={() => setStage('idle')}>
          <div
            id="print-dialog"
            className="print-dialog__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="print-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="print-dialog__title" id="print-dialog-title">Imprimer le livret</h2>
            <p className="print-dialog__text">
              Les {total} pages du livret seront préparées au format A4 (portrait), une page
              du livre par feuille.
            </p>
            <p className="print-dialog__hint">
              Pour obtenir un fichier PDF : dans la fenêtre d’impression, choisissez
              <strong> « Enregistrer au format PDF »</strong> comme destination, gardez le
              format <strong>A4</strong> et les marges par défaut.
            </p>

            <label className="print-dialog__option">
              <input
                id="print-include-answers"
                type="checkbox"
                checked={includeAnswers}
                onChange={(e) => setIncludeAnswers(e.target.checked)}
              />
              <span>
                Inclure mes réponses
                <br />
                <small>Sinon le livret s’imprime vierge, prêt à être rempli à la main.</small>
              </span>
            </label>

            <div className="print-dialog__actions">
              <button
                type="button"
                className="print-dialog__btn"
                onClick={() => setStage('idle')}
              >
                Annuler
              </button>
              <button
                type="button"
                id="print-confirm"
                className="print-dialog__btn print-dialog__btn--primary"
                onClick={() => setStage('preparing')}
              >
                Préparer l’impression
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {building && createPortal(
        <div className="print-progress__backdrop" role="status" aria-live="polite">
          <div className="print-progress__spinner" aria-hidden="true" />
          <div className="print-progress__label" id="print-progress-label">
            {stage === 'preparing'
              ? `Préparation du livret… (${total} pages)`
              : 'Ouverture de la fenêtre d’impression…'}
          </div>
          <div className="print-progress__sub">
            Cela peut prendre quelques secondes. Ne fermez pas cette page.
          </div>
        </div>,
        document.body
      )}

      {building && (
        <PrintBook
          pages={pages}
          questions={questions}
          includeAnswers={includeAnswers}
          getAnswer={getAnswer}
          onReady={() => setStage('printing')}
          onDone={() => setStage('idle')}
        />
      )}
    </>
  );
}
