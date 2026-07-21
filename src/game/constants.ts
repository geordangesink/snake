// Game constants — kept identical to the desktop build (../snake/renderer/app.js)
// so a mobile peer plays on the exact same board as a desktop peer.
export const TILES = 30 // board is TILES x TILES cells
export const SPEED = 100 // tick interval in ms

export type Coord = { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right'
