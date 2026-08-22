export default function IndexPage({ units, onNavigate }) {
  const stopEvent = (e) => e.stopPropagation();

  return (
    <div className="index-page">
      <h2 className="index-page__title">Sommaire</h2>
      <div className="index-page__units">
        {units.map((unit) => (
          <div key={unit.id} className="index-page__unit">
            <h3 className="index-page__unit-title">{unit.title}</h3>
            <div className="index-page__lessons">
              {unit.lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  className="index-page__lesson"
                  onClick={() => onNavigate(lesson.pageIndex)}
                  onPointerDown={stopEvent}
                  onMouseDown={stopEvent}
                  onTouchStart={stopEvent}
                >
                  <span className="index-page__lesson-num">{lesson.number}</span>
                  <span className="index-page__lesson-title">{lesson.title}</span>
                  <span className="index-page__lesson-page">p. {lesson.pageIndex + 1}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
