import { TILES, SPEED, POINTS_PER_PEAR, Coord, Direction } from './constants'

// The mobile game engine is a faithful port of the desktop renderer
// (../snake/renderer/app.js). All gameplay math — snake movement, wrapping,
// collisions, food placement, the P2P sync payload — is identical so mobile and
// desktop peers share one game. The only things stripped out are the browser
// concerns (canvas drawing, keydown listeners, custom element lifecycle); the
// React view layer renders from this state and feeds directions back in.

export type PeerState = {
  id: string
  food: Coord | null
  snake: Coord[]
  drop: boolean
}

// One row of the multiplayer leaderboard: a player's color and current score.
export type Standing = { id: string; color: string; score: number; me: boolean }

export class Player {
  id: string
  color: string
  game: SnakeGame
  score = 0
  snake: Coord[] = []
  direction: Coord = { x: 0, y: 0 }

  constructor(id: string, game: SnakeGame) {
    this.id = id
    this.color = '#' + id.slice(0, 6)
    this.game = game
  }

  tick(food: Coord): boolean {
    if (this.snake.length === 0) this.snake.unshift(this.game.pos())
    const head = {
      x: (this.snake[0].x + this.direction.x + TILES) % TILES,
      y: (this.snake[0].y + this.direction.y + TILES) % TILES
    }
    this.snake.unshift(head)
    const ate = head.x === food.x && head.y === food.y
    if (ate) this.score++
    else this.snake.pop()
    return ate
  }

  collides(player: Player): boolean {
    const head = this.snake[0]
    if (!head) return false
    return player.snake.some((seg) => seg.x === head.x && seg.y === head.y)
  }

  selfCollides(): boolean {
    const [head, ...body] = this.snake
    return body.some((segment) => segment.x === head.x && segment.y === head.y)
  }
}

type EngineHooks = {
  // Trigger a re-render of the view layer.
  onChange: () => void
  // Broadcast a JSON game-state string to peers (wired to the worker's `send`).
  send: (data: string) => void
  // Notify the view layer that the local player lost.
  onOver?: () => void
}

export class SnakeGame {
  players = new Map<string, Player>()
  speed = SPEED
  food: Coord | null = null
  player: Player | null = null
  drop = false
  topicBuffer: Uint8Array | null = null

  private timer: ReturnType<typeof setTimeout> | null = null
  private hooks: EngineHooks

  constructor(hooks: EngineHooks) {
    this.hooks = hooks
  }

  start(playerId: string, topicBuffer: Uint8Array) {
    this.topicBuffer = topicBuffer
    this.food = { x: topicBuffer[0] % TILES, y: topicBuffer[1] % TILES }
    this.player = new Player(playerId, this)
    this.addPlayer(this.player)
    this.loop()
  }

  // Equivalent of the desktop keydown handler: change heading (never reverse
  // onto the current axis) and take an immediate step so input feels responsive.
  setDirection(dir: Direction) {
    if (this.drop || !this.player) return
    const p = this.player
    if (dir === 'up' && p.direction.y === 0) p.direction = { x: 0, y: -1 }
    else if (dir === 'down' && p.direction.y === 0) p.direction = { x: 0, y: 1 }
    else if (dir === 'left' && p.direction.x === 0) p.direction = { x: -1, y: 0 }
    else if (dir === 'right' && p.direction.x === 0) p.direction = { x: 1, y: 0 }
    setTimeout(() => {
      this.tick()
      this.hooks.onChange()
    }, 0)
  }

  over() {
    if (this.drop) return
    this.drop = true
    this.dropPlayer(this.player!)
    this.hooks.onOver?.()
  }

  sync() {
    if (!this.player) return
    const data = JSON.stringify({
      id: this.player.id,
      food: this.food,
      snake: this.player.snake,
      drop: this.drop
    })
    this.hooks.send(data)
  }

  pos(): Coord {
    const coords = {
      x: Math.floor(Math.random() * TILES),
      y: Math.floor(Math.random() * TILES)
    }
    if (coords.x === this.food?.x && coords.y === this.food?.y) return this.pos()
    if (
      [...this.players.values()].some(
        (player) => coords.x === player.snake[0]?.x && coords.y === player.snake[0]?.y
      )
    ) {
      return this.pos()
    }
    return coords
  }

  tick() {
    if (this.topicBuffer === null) return
    if (this.food === null) this.food = this.pos()
    const ate = this.player!.tick(this.food)
    if (ate) this.food = this.pos()
    for (const opponent of this.players.values()) {
      if (opponent === this.player) {
        if (this.player.selfCollides()) this.over()
      } else if (this.player!.collides(opponent)) this.over()
      else if (opponent.collides(this.player!)) this.dropPlayer(opponent)
    }
  }

  loop() {
    this.tick()
    this.sync()
    this.hooks.onChange()
    this.timer = setTimeout(() => this.loop(), this.speed)
  }

  // Stop the game loop (view unmount / leaving the game).
  destroy() {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  // Stop and clear all game state so the engine can be reused for a new game
  // without recreating the instance (keeps view-layer closures valid).
  leave() {
    this.destroy()
    this.players.clear()
    this.food = null
    this.player = null
    this.drop = false
    this.topicBuffer = null
  }

  // Restart the local player on the same topic without tearing down the swarm.
  reset() {
    if (!this.topicBuffer || !this.player) return
    const id = this.player.id
    this.dropPlayer(this.player)
    this.drop = false
    this.food = { x: this.topicBuffer[0] % TILES, y: this.topicBuffer[1] % TILES }
    this.player = new Player(id, this)
    this.addPlayer(this.player)
    this.hooks.onChange()
  }

  // --- scoring / leaderboard ---
  // Score is derived from snake length (each pear grows the snake by one), so it
  // needs no extra field in the sync payload: a peer's score follows from the
  // snake they already broadcast, keeping the wire format identical to desktop.
  score(player: Player): number {
    return Math.max(0, player.snake.length - 1) * POINTS_PER_PEAR
  }

  myScore(): number {
    return this.player ? this.score(this.player) : 0
  }

  // Every player by color, highest score first. Keeps the local player visible
  // even after they've been dropped from the board (so their final score shows).
  leaderboard(): Standing[] {
    const players = new Map(this.players)
    if (this.player) players.set(this.player.id, this.player)
    return [...players.values()]
      .map((p) => ({
        id: p.id,
        color: p.color,
        score: this.score(p),
        me: p.id === this.player?.id
      }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  }

  addPlayer(player: Player) {
    this.players.set(player.id, player)
  }

  dropPlayer(player: Player) {
    if (!this.players.has(player.id)) return
    this.players.delete(player.id)
  }

  // --- peer events, forwarded from the worker by the view layer ---

  addPeer(id: string) {
    if (!this.players.has(id)) this.addPlayer(new Player(id, this))
  }

  removePeer(id: string) {
    const player = this.players.get(id)
    if (player) this.dropPlayer(player)
  }

  applyPeerState(state: PeerState) {
    const player = this.players.get(state.id)
    if (!player) return
    if (state.drop) {
      this.dropPlayer(player)
    } else if (state.snake) {
      if (state.snake.length > player.snake.length) this.food = state.food
      player.snake = state.snake
    }
  }
}
