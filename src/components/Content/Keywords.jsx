export default function Keywords({ title, items = [] }) {
  return (
    <div className="keywords">
      {title && <h4 className="keywords__title">{title}</h4>}
      <div className="keywords__list">
        {items.map((item, i) => (
          <span key={i} className="keywords__chip">{item}</span>
        ))}
      </div>
    </div>
  );
}
