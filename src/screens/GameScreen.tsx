import { useEffect, useRef, useState } from 'react'
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Board } from '../game/Board'
import { Direction } from '../game/constants'
import { SnakeGame } from '../game/engine'
import { DPad } from '../components/DPad'
import { theme } from '../theme'

type Props = {
  game: SnakeGame
  size: number
  topic: string
  peers: number
  over: boolean
  version: number
  onDirection: (dir: Direction) => void
  onLeave: () => void
  onPlayAgain: () => void
}

const SWIPE_THRESHOLD = 12

export function GameScreen({
  game,
  size,
  topic,
  peers,
  over,
  version,
  onDirection,
  onLeave,
  onPlayAgain
}: Props) {
  // Keep the latest onDirection reachable from the (stable) PanResponder.
  const directionRef = useRef(onDirection)
  directionRef.current = onDirection

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > SWIPE_THRESHOLD || Math.abs(g.dy) > SWIPE_THRESHOLD,
      onPanResponderRelease: (_e, g) => {
        const { dx, dy } = g
        if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return
        if (Math.abs(dx) > Math.abs(dy)) directionRef.current(dx > 0 ? 'right' : 'left')
        else directionRef.current(dy > 0 ? 'down' : 'up')
      }
    })
  ).current

  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(copyTimer.current), [])

  async function copyTopic() {
    if (!topic) return
    await Clipboard.setStringAsync(topic)
    setCopied(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onLeave} hitSlop={8}>
          <Text style={styles.leave}>‹ Leave</Text>
        </Pressable>
        <Text style={styles.peers}>Peers: {peers}</Text>
      </View>

      <View style={styles.boardWrap} {...pan.panHandlers}>
        <Board game={game} size={size} over={over} version={version} />
        {over && (
          <View style={[styles.overlay, { width: size, height: size }]}>
            <Text style={styles.overText}>Game Over</Text>
            <Pressable
              onPress={onPlayAgain}
              style={({ pressed }) => [styles.playAgain, pressed && styles.playAgainActive]}
            >
              <Text style={styles.playAgainText}>Play again</Text>
            </Pressable>
          </View>
        )}
      </View>

      <DPad onDirection={onDirection} disabled={over} />

      <Pressable
        onPress={copyTopic}
        accessibilityRole='button'
        accessibilityLabel='Copy game topic to clipboard'
        style={({ pressed }) => [styles.details, pressed && styles.detailsActive]}
      >
        <View style={styles.detailsHeader}>
          <Text style={styles.detailsLabel}>Topic (share to invite):</Text>
          <Text style={styles.copyHint}>{copied ? '✓ Copied' : 'Tap to copy'}</Text>
        </View>
        <Text style={styles.topic} selectable>
          {topic}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    marginBottom: 12
  },
  leave: {
    color: theme.accent,
    fontFamily: theme.mono,
    fontSize: 16
  },
  peers: {
    color: theme.accent,
    fontFamily: theme.mono,
    fontSize: 16
  },
  boardWrap: {
    position: 'relative'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)'
  },
  overText: {
    color: theme.accent,
    fontFamily: theme.mono,
    fontSize: 32,
    marginBottom: 20
  },
  playAgain: {
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.panel,
    paddingVertical: 10,
    paddingHorizontal: 18
  },
  playAgainActive: {
    backgroundColor: theme.accent
  },
  playAgainText: {
    color: theme.accent,
    fontFamily: theme.mono,
    fontSize: 16
  },
  details: {
    marginTop: 16,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.panel,
    padding: 10
  },
  detailsActive: {
    opacity: 0.6
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  detailsLabel: {
    color: theme.accent,
    fontFamily: theme.mono,
    fontSize: 12
  },
  copyHint: {
    color: theme.accent,
    fontFamily: theme.mono,
    fontSize: 12
  },
  topic: {
    color: theme.accent,
    fontFamily: theme.mono,
    fontSize: 11
  }
})
