export default function Keywords({ title, items = [], 'data-block-index': blockIndex }) {
  return (
    <div className="keywords" data-block-index={blockIndex}>
      {title && <h4 className="keywords__title">{title}</h4>}
      <div className="keywords__list">
        {items.map((item, i) => (
          <span key={i} className="keywords__chip">{item}</span>
        ))}
      </div>
    </div>
  );
}

