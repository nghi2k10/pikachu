export interface BoardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  gap: number;
  rows: number;
  cols: number;
}

export function calculateBoardLayout(
  viewportWidth: number,
  viewportHeight: number,
  rows: number,
  cols: number,
): BoardLayout {
  if (![viewportWidth, viewportHeight, rows, cols].every(Number.isFinite)
    || viewportWidth <= 0 || viewportHeight <= 0 || rows <= 0 || cols <= 0) {
    throw new RangeError("Viewport and board dimensions must be positive numbers");
  }

  const margin = Math.max(12, Math.min(34, viewportWidth * 0.035));
  const gap = Math.max(3, Math.min(9, viewportWidth / (cols * 12)));
  const availableWidth = Math.max(1, viewportWidth - margin * 2 - gap * (cols - 1));
  const availableHeight = Math.max(1, viewportHeight - margin * 2 - gap * (rows - 1));
  const tileWidth = Math.min(84, availableWidth / cols, (availableHeight / rows) * 1.22);
  const tileHeight = tileWidth / 1.16;
  const width = tileWidth * cols + gap * (cols - 1);
  const height = tileHeight * rows + gap * (rows - 1);

  return {
    x: (viewportWidth - width) / 2,
    y: (viewportHeight - height) / 2,
    width,
    height,
    tileWidth,
    tileHeight,
    gap,
    rows,
    cols,
  };
}