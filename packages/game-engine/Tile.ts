export interface Position {
  row: number;
  col: number;
}

export interface Tile extends Position {
  id: string;
  type: number;
  alive: boolean;
}