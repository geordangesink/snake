import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Direction } from '../game/constants'
import { theme } from '../theme'

type Props = {
  onDirection: (dir: Direction) => void
  disabled?: boolean
}

type ButtonProps = {
  dir: Direction
  glyph: string
  onDirection: (dir: Direction) => void
  disabled?: boolean
}

// Kept at module scope so its type identity is stable. The game re-renders
// ~10x/second (the 100ms engine loop); a component defined inside DPad's render
// body would be a new type every tick, so React would unmount/remount all four
// buttons and drop taps that straddle a re-render.
function DPadButton({ dir, glyph, onDirection, disabled }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onDirection(dir)}
      style={({ pressed }) => [
        styles.btn,
        pressed && styles.btnActive,
        disabled && styles.btnDisabled
      ]}
      hitSlop={6}
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  )
}

// On-screen arrow pad — the touch equivalent of the desktop arrow keys. Swiping
// the board works too (see GameScreen); the pad is here for precise taps. Memoized
// (with a stable onDirection from App) so it does not re-render on every tick.
function DPadComponent({ onDirection, disabled }: Props) {
  return (
    <View style={styles.pad}>
      <View style={styles.row}>
        <DPadButton dir='up' glyph='▲' onDirection={onDirection} disabled={disabled} />
      </View>
      <View style={styles.row}>
        <DPadButton dir='left' glyph='◀' onDirection={onDirection} disabled={disabled} />
        <View style={styles.spacer} />
        <DPadButton dir='right' glyph='▶' onDirection={onDirection} disabled={disabled} />
      </View>
      <View style={styles.row}>
        <DPadButton dir='down' glyph='▼' onDirection={onDirection} disabled={disabled} />
      </View>
    </View>
  )
}

export const DPad = memo(DPadComponent)

const SIZE = 64

const styles = StyleSheet.create({
  pad: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  spacer: {
    width: SIZE,
    height: SIZE
  },
  btn: {
    width: SIZE,
    height: SIZE,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.panel
  },
  btnActive: {
    backgroundColor: theme.accent
  },
  btnDisabled: {
    opacity: 0.35
  },
  glyph: {
    color: theme.accent,
    fontSize: 24,
    fontFamily: theme.mono
  }
})
