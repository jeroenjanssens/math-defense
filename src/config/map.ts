/** Map layout on a grid; the map sits left of the answer panel, below the HUD. */
export const CELL = 60;
export const MAP_COLS = 15;
export const MAP_ROWS = 11;
export const MAP_X = 0;
export const MAP_Y = 60;
export const MAP_WIDTH = MAP_COLS * CELL;
export const MAP_HEIGHT = MAP_ROWS * CELL;

export interface Cell {
  col: number;
  row: number;
}

/** Path corners in grid cells; enemies walk from the first to the last. */
export const PATH_CELLS: Cell[] = [
  { col: -1, row: 2 },
  { col: 3, row: 2 },
  { col: 3, row: 8 },
  { col: 7, row: 8 },
  { col: 7, row: 2 },
  { col: 11, row: 2 },
  { col: 11, row: 8 },
  { col: 13, row: 8 },
];

export const BASE_CELL: Cell = { col: 13, row: 8 };

export const BUILD_SPOTS: Cell[] = [
  { col: 1, row: 4 },
  { col: 1, row: 7 },
  { col: 5, row: 1 },
  { col: 5, row: 4 },
  { col: 5, row: 6 },
  { col: 5, row: 10 },
  { col: 9, row: 0 },
  { col: 9, row: 4 },
  { col: 9, row: 6 },
  { col: 9, row: 9 },
  { col: 13, row: 1 },
  { col: 13, row: 4 },
  { col: 13, row: 6 },
  { col: 2, row: 10 },
];

/** Where the free starting tower goes. */
export const START_TOWER_SPOT = 3;
/** Build spot highlighted during the tutorial. */
export const TUTORIAL_BUILD_SPOT = 4;

export const cellCenter = (cell: Cell): { x: number; y: number } => ({
  x: MAP_X + cell.col * CELL + CELL / 2,
  y: MAP_Y + cell.row * CELL + CELL / 2,
});
