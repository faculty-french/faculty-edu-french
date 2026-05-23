export default function ObjectivesBox({ title, items }) {
  return (
    <div className="objectives-box">
      <div className="objectives-box__header">
        <div className="objectives-box__icon">💡</div>
        <h3 className="objectives-box__title" dangerouslySetInnerHTML={{ __html: title || 'Objectifs de cette leçon' }} />
      </div>
      <ul className="objectives-box__list">
        {items.map((item, i) => (
          <li key={i} className="objectives-box__item" dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>
    </div>
  );
}
