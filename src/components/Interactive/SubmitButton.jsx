import { useState, useEffect } from 'react';
import { sendToTelegram } from '../../services/telegram';

export default function SubmitButton({
  lessonId,
  lessonTitle,
  questions = [],
  answers = {},
  validateAnswers,
  markSubmitted,
  isSubmitted
}) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error' | 'invalid'
  const [missingQuestions, setMissingQuestions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const stopEvent = (e) => e.stopPropagation();

  useEffect(() => {
    if (isSubmitted && isSubmitted()) {
      setAlreadySubmitted(true);
      setStatus('success');
    }
  }, [isSubmitted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (alreadySubmitted) return;

    // 1. Validate answers
    const validation = validateAnswers(questions);
    if (!validation.isComplete) {
      setMissingQuestions(validation.missing);
      setStatus('invalid');
      return;
    }

    // 2. Submit to Telegram
    setStatus('loading');
    setErrorMessage('');
    
    try {
      const studentName = (() => {
        try {
          const profile = localStorage.getItem('book_student_profile');
          return profile ? JSON.parse(profile).name : 'Étudiant anonyme';
        } catch { return 'Étudiant anonyme'; }
      })();

      // Use the synchronous answers returned from validation if available
      const currentAnswers = validation.answers || answers;
      await sendToTelegram(studentName, lessonTitle, questions, currentAnswers);
      
      markSubmitted();
      setAlreadySubmitted(true);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de la soumission.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="submission-success" onPointerDown={stopEvent} onMouseDown={stopEvent} onTouchStart={stopEvent}>
        <div className="submission-success__icon">🎉</div>
        <h4 className="submission-success__title">Devoir soumis avec succès !</h4>
        <p className="page__paragraph" style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Vos réponses ont été envoyées à l'enseignant. Merci !
        </p>
      </div>
    );
  }

  return (
    <div className="submit-container" onPointerDown={stopEvent} onMouseDown={stopEvent} onTouchStart={stopEvent}>
      {status === 'invalid' && (
        <div className="validation-notification">
          <h4 className="validation-notification__title">⚠️ Questions non résolues</h4>
          <p className="page__paragraph" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
            Veuillez répondre à toutes les questions avant de soumettre :
          </p>
          <ul className="validation-notification__list">
            {missingQuestions.map((q) => (
              <li key={q.questionId} className="validation-notification__item">
                Question {q.index} : "{q.text.substring(0, 50)}..."
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'error' && (
        <div className="validation-notification" style={{ borderColor: 'var(--color-error)', background: 'var(--color-error-bg)' }}>
          <h4 className="validation-notification__title" style={{ color: 'var(--color-error)' }}>⚠️ Échec de l'envoi</h4>
          <p className="page__paragraph" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
            {errorMessage}. Veuillez vérifier votre connexion internet et réessayer.
          </p>
        </div>
      )}

      <button
        className={`submit-btn ${status === 'loading' ? 'submit-btn--loading' : ''}`}
        onClick={handleSubmit}
        disabled={status === 'loading'}
        type="button"
        id={`submit-btn-${lessonId}`}
      >
        {status === 'loading' ? 'Envoi en cours...' : 'Soumettre mes réponses'}
      </button>
    </div>
  );
}
