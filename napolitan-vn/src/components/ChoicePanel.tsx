import type { Choice } from '../data/schema';
import './ChoicePanel.css';

interface Props {
  choices: Choice[];
  onSelect: (index: number) => void;
}

export default function ChoicePanel({ choices, onSelect }: Props) {
  if (choices.length === 0) return null;

  return (
    <div className="choice-panel">
      {choices.map((choice, i) => (
        <button
          key={i}
          className="choice-button"
          onClick={() => onSelect(i)}
        >
          <span className="choice-marker">{String(i + 1).padStart(2, '0')}</span>
          <span className="choice-text">{choice.text}</span>
        </button>
      ))}
    </div>
  );
}
