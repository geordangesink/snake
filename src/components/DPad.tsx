import { memo } from 'react'
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { Direction } from '../game/constants'
import { theme } from '../theme'

type Props = {
  onDirection: (dir: Direction) => void
  disabled?: boolean
}

type WedgeProps = {
  dir: Direction
  cornerStyle: StyleProp<ViewStyle>
  onDirection: (dir: Direction) => void
  disabled?: boolean
}

// Retro donut D-pad: one ring split into four quadrant segments (up/right/down/
// left) divided by diagonal borders — each whole wedge is a button. Built from a
// 2x2 of quarter-circle Pressables rotated 45deg so the seams fall on the
// diagonals; the outer ring, hollow center, and arrows are non-rotated overlays
// on top. Arrows are View triangles (no font/emoji dependency).
const RING = 180 // outer diameter
const R = RING / 2 // quarter-circle size
const HOLE = 74 // hollow center diameter
const ARROW = 13 // half-base of the triangle arrows

// Module scope so the component's type identity is stable. The game re-renders
// ~10x/second (the 100ms engine loop); a component defined inside DPad's render
// body would be a new type every tick, remounting every wedge and dropping taps
// that straddle a re-render.
function Wedge({ dir, cornerStyle, onDirection, disabled }: WedgeProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onDirection(dir)}
      style={({ pressed }) => [styles.quarter, cornerStyle, pressed && styles.quarterPressed]}
    />
  )
}

// On-screen arrow pad — the touch equivalent of the desktop arrow keys. Swiping
// the board works too (see GameScreen); the pad is here for precise taps. Memoized
// (with a stable onDirection from App) so it does not re-render on every tick.
function DPadComponent({ onDirection, disabled }: Props) {
  return (
    <View style={[styles.pad, disabled && styles.padDisabled]}>
      {/* Rotated wheel: 4 quarter Pressables. Seams (inner borders) land on the
          diagonals after the 45deg rotation, splitting it into N/E/S/W wedges. */}
      <View style={styles.wheel}>
        <Wedge dir='up' cornerStyle={styles.qTL} onDirection={onDirection} disabled={disabled} />
        <Wedge dir='right' cornerStyle={styles.qTR} onDirection={onDirection} disabled={disabled} />
        <Wedge dir='down' cornerStyle={styles.qBR} onDirection={onDirection} disabled={disabled} />
        <Wedge dir='left' cornerStyle={styles.qBL} onDirection={onDirection} disabled={disabled} />
      </View>

      {/* Non-rotated overlays: crisp outer ring, hollow center, and arrows. */}
      <View style={styles.ringOutline} pointerEvents='none' />
      <View style={styles.hole} pointerEvents='none' />
      <View style={styles.arrows} pointerEvents='none'>
        <View style={[styles.arrow, styles.arrowUp]} />
        <View style={[styles.arrow, styles.arrowDown]} />
        <View style={[styles.arrow, styles.arrowLeft]} />
        <View style={[styles.arrow, styles.arrowRight]} />
      </View>
    </View>
  )
}

export const DPad = memo(DPadComponent)

const styles = StyleSheet.create({
  pad: {
    width: RING,
    height: RING,
    alignSelf: 'center',
    position: 'relative'
  },
  padDisabled: {
    opacity: 0.35
  },
  wheel: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RING,
    height: RING,
    borderRadius: R,
    overflow: 'hidden',
    transform: [{ rotate: '45deg' }]
  },
  quarter: {
    position: 'absolute',
    width: R,
    height: R,
    backgroundColor: theme.panel,
    borderColor: theme.accent
  },
  quarterPressed: {
    backgroundColor: 'rgba(176, 217, 68, 0.30)'
  },
  qTL: { top: 0, left: 0, borderTopLeftRadius: R, borderRightWidth: 1, borderBottomWidth: 1 },
  qTR: { top: 0, right: 0, borderTopRightRadius: R, borderLeftWidth: 1, borderBottomWidth: 1 },
  qBL: { bottom: 0, left: 0, borderBottomLeftRadius: R, borderRightWidth: 1, borderTopWidth: 1 },
  qBR: { bottom: 0, right: 0, borderBottomRightRadius: R, borderLeftWidth: 1, borderTopWidth: 1 },
  ringOutline: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RING,
    height: RING,
    borderRadius: R,
    borderWidth: 2,
    borderColor: theme.accent
  },
  hole: {
    position: 'absolute',
    top: (RING - HOLE) / 2,
    left: (RING - HOLE) / 2,
    width: HOLE,
    height: HOLE,
    borderRadius: HOLE / 2,
    borderWidth: 2,
    borderColor: theme.accent,
    backgroundColor: theme.background
  },
  arrows: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderColor: 'transparent'
  },
  arrowUp: {
    top: 20,
    left: R - ARROW,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderBottomWidth: ARROW * 1.5,
    borderBottomColor: theme.accent
  },
  arrowDown: {
    bottom: 20,
    left: R - ARROW,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderTopWidth: ARROW * 1.5,
    borderTopColor: theme.accent
  },
  arrowLeft: {
    left: 20,
    top: R - ARROW,
    borderTopWidth: ARROW,
    borderBottomWidth: ARROW,
    borderRightWidth: ARROW * 1.5,
    borderRightColor: theme.accent
  },
  arrowRight: {
    right: 20,
    top: R - ARROW,
    borderTopWidth: ARROW,
    borderBottomWidth: ARROW,
    borderLeftWidth: ARROW * 1.5,
    borderLeftColor: theme.accent
  }
})
