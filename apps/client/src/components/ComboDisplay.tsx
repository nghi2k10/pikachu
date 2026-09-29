interface ComboDisplayProps {
  combo: number;
}

export function ComboDisplay({ combo }: ComboDisplayProps) {
  return (
    <div className={`stat-block stat-combo ${combo > 1 ? "is-hot" : ""}`}>
      <span className="stat-label">Combo</span>
      <strong className="stat-value">x{combo}</strong>
    </div>
  );
}