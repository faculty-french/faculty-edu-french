export default function ModuleDivider({ module, title, lessons = [] }) {
  // "Module 2 : La technologie et la société" → eyebrow "MODULE 2", main "La technologie…"
  const [, mainTitle = title] = title.split(/^Module \d+\s*:\s*/);
  return (
    <div className={`module-divider module-divider--${module}`}>
      <span className="module-divider__watermark" aria-hidden="true">{module}</span>
      <span className="module-divider__eyebrow">Module {module}</span>
      <span className="module-divider__rule" />
      <h2 className="module-divider__title">{mainTitle}</h2>
      <ul className="module-divider__lessons">
        {lessons.map(l => <li key={l.id} className="module-divider__lesson">{l.title}</li>)}
      </ul>
    </div>
  );
}
