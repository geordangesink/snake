import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'

type Props = {
  onCreate: () => void
  onJoin: (topic: string) => void
}

// Port of the desktop setup view (#setup): Create a new game, or join an
// existing one by pasting its topic.
export function SetupScreen({ onCreate, onJoin }: Props) {
  const [topic, setTopic] = useState('')

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍐 Snake</Text>

      <Pressable
        onPress={onCreate}
        style={({ pressed }) => [styles.button, pressed && styles.buttonActive]}
      >
        <Text style={styles.buttonText}>Create</Text>
      </Pressable>

      <Text style={styles.or}>- or -</Text>

      <TextInput
        value={topic}
        onChangeText={setTopic}
        placeholder='Game Topic'
        placeholderTextColor='#6f8a2e'
        autoCapitalize='none'
        autoCorrect={false}
        style={styles.input}
      />
      <Pressable
        disabled={topic.trim().length === 0}
        onPress={() => onJoin(topic.trim())}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonActive,
          topic.trim().length === 0 && styles.buttonDisabled
        ]}
      >
        <Text style={styles.buttonText}>Join</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  title: {
    color: theme.accent,
    fontSize: 40,
    fontFamily: theme.mono,
    marginBottom: 40
  },
  button: {
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.panel,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 220,
    alignItems: 'center'
  },
  buttonActive: {
    backgroundColor: theme.accent
  },
  buttonDisabled: {
    opacity: 0.35
  },
  buttonText: {
    color: theme.accent,
    fontFamily: theme.mono,
    fontSize: 16
  },
  or: {
    color: theme.text,
    fontFamily: theme.mono,
    marginVertical: 24
  },
  input: {
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.panel,
    color: theme.accent,
    fontFamily: theme.mono,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 220,
    marginBottom: 16
  }
})
