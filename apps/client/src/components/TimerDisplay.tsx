interface TimerDisplayProps {
  seconds: number;
}

export function TimerDisplay({ seconds }: TimerDisplayProps) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return (
    <div className={`stat-block stat-timer ${seconds <= 15 ? "is-urgent" : ""}`}>
      <span className="stat-label">Time</span>
      <strong className="stat-value">{minutes}:{remainder}</strong>
    </div>
  );
}