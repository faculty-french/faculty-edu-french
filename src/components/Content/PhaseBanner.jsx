const PHASE_LABELS = {
  1: 'Phase 1',
  2: 'Phase 2',
  3: 'Phase 3',
  4: 'Phase 4'
};

export default function PhaseBanner({ phase, title, duration }) {
  return (
    <div className={`phase-banner phase-banner--${phase}`}>
      <span className="phase-banner__number">{PHASE_LABELS[phase] || 'Phase'}</span>
      <span className="phase-banner__title">{title}</span>
      {duration && <span className="phase-banner__timer">{duration}</span>}
    </div>
  );
}
