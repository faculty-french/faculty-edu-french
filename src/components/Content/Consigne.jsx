export default function Consigne({ text }) {
  return (
    <div className="consigne">
      <span className="consigne__label">Consigne</span>
      <p className="consigne__text">{text}</p>
    </div>
  );
}
