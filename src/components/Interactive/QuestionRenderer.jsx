import OpenEnded from './OpenEnded';
import MCQ from './MCQ';
import VraiFaux from './VraiFaux';

const COMPONENTS = {
  'open-ended': OpenEnded,
  'multiple-choice': MCQ,
  'vrai-faux': VraiFaux,
};

export default function QuestionRenderer({ question, value, onChange, hideText = false }) {
  const Component = COMPONENTS[question.type];
  if (!Component) {
    return <p className="page__paragraph">Type de question non supporté : {question.type}</p>;
  }
  return <Component question={question} value={value} onChange={onChange} hideText={hideText} />;
}
