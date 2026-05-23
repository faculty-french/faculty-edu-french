import { useState } from 'react';

export default function NamePrompt({ onSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('book_student_profile', JSON.stringify({ name: name.trim() }));
      onSubmit(name.trim());
    }
  };

  return (
    <div className="name-prompt-overlay">
      <form className="name-prompt" onSubmit={handleSubmit}>
        <h2 className="name-prompt__title">👋 Bienvenue !</h2>
        <p className="name-prompt__subtitle">Entrez votre nom pour commencer</p>
        <input
          className="name-prompt__input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom..."
          autoFocus
          id="student-name-input"
        />
        <button
          className="name-prompt__btn"
          type="submit"
          disabled={!name.trim()}
          id="name-submit-btn"
        >
          Commencer la lecture
        </button>
      </form>
    </div>
  );
}
