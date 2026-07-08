export default function Microtask({ number, text, duration }) {
  return (
    <div className="microtask">
      <span className="microtask__label">Micro-tâche {number}</span>
      <p className="microtask__text">{text}</p>
      {duration && <span className="microtask__timer">{duration}</span>}
    </div>
  );
}
