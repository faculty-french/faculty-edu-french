export default function IndexPage({ units, onNavigate }) {
  const stopEvent = (e) => e.stopPropagation();

  return (
    <div className="index-page">
      <h2 className="page__heading page__heading--1" style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>Sommaire</h2>
      <div className="index-page__units">
        {units.map((unit) => (
          <div key={unit.id} style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 className="page__heading page__heading--3" style={{ borderBottom: '2px solid var(--color-primary-light)', paddingBottom: 'var(--spacing-xs)' }}>
              {unit.title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
              {unit.lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => onNavigate(lesson.pageIndex)}
                  onPointerDown={stopEvent}
                  onMouseDown={stopEvent}
                  onTouchStart={stopEvent}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)',
                    padding: 'var(--spacing-sm)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-bg)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{lesson.number}</span>
                  <span style={{ flex: 1 }}>{lesson.title}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>p. {lesson.pageIndex + 1}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
