'use strict'

// Wires the Android release build up to the Pear OTA JS bundle.
//
// STOPGAP. This is a backport of the fix in pear-runtime-react-native 3.0.0.
// Once that is published, bump the dependency and delete this file along with
// its entry in app.json — the library then generates the same code, and this
// plugin already stands down when it sees the library's marker.
//
// Why it exists: pear-runtime-react-native 2.0.1 patches iOS (AppDelegate's
// bundleURL) correctly, but its Android half looks for a `getJSBundleFile()`
// override or a `getPackages(): List<ReactPackage>` block in MainApplication.
// Neither exists under the New Architecture (RN 0.83 / Expo 55), where
// MainApplication only exposes `reactHost` via ExpoReactHostFactory. The
// upstream mod therefore matches nothing and returns silently, so release APKs
// always load the bundle baked into the APK. An OTA update then downloads and
// "applies" forever without the running version ever changing — the update
// banner comes back after every restart.
//
// The New Architecture entry point takes the bundle path as an argument
// (`jsBundleFilePath`), captured once when the ReactHost is built, so the
// "check whether an OTA file exists, else fall back" trick iOS uses does not
// translate. Instead we point React Native at a fixed path that always exists —
// <filesDir>/pear-runtime/ota/app.bundle — and seed it from the APK's embedded
// bundle on first launch. pear-runtime-updater's applyUpdate() swaps the
// downloaded payload into that same directory, and ReactHostImpl rebuilds its
// JSBundleLoader from the delegate on every reload(), so the next
// reloadAppAsync() picks the new bundle up without a process restart.
//
// Runs after pear-runtime-react-native/plugin (a no-op on Android) and is
// idempotent, so it survives repeated `expo prebuild`.

const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const MARKER = '// snake-mobile: pear-runtime OTA bundle'
// Written by pear-runtime-react-native >= 3.0.0, which does this itself.
const UPSTREAM_MARKER = '// pear-runtime-react-native OTA bundle'
const ANCHOR = 'ExpoReactHostFactory.getDefaultReactHost('

// Kept byte-identical to the pear-runtime-react-native 3.0.0 template (bar the
// marker) so switching to the published library changes no generated code.
const OTA_FUNCTION = `
  ${MARKER}
  //
  // Release builds always load the JS bundle from a fixed path under filesDir,
  // seeded from the APK's embedded bundle on first launch. pear-runtime-updater
  // swaps an applied update into that same directory, and the bundle is re-read
  // from disk every time the React instance is (re)created, so an update takes
  // effect on the next reload.
  //
  // The obvious alternative -- "use the OTA file if it exists, else fall back to
  // the embedded bundle" -- does not work on Android: unlike iOS's bundleURL(),
  // the path here is resolved once, when the ReactHost or ReactInstanceManager
  // is built, and the result is kept for the life of the process. A freshly
  // installed app resolves it before any update exists, so the first applied
  // update would never load and the app would keep offering it forever.
  private fun pearOtaBundlePath(): String? {
    if (BuildConfig.DEBUG) return null
    return try {
      val root = File(applicationContext.filesDir, "pear-runtime")
      val otaDir = File(root, "ota")
      val bundle = File(otaDir, "app.bundle")
      // Kept outside otaDir: applying an update replaces that whole directory.
      val stamp = File(root, "ota.apk-version")
      val installed = packageManager.getPackageInfo(packageName, 0).lastUpdateTime.toString()

      // A newly installed APK ships a newer embedded bundle than any payload
      // staged against the previous build, so drop the stale one.
      if (stamp.takeIf { it.exists() }?.readText() != installed) {
        otaDir.deleteRecursively()
      }

      if (!bundle.exists()) {
        otaDir.mkdirs()
        val staged = File(otaDir, "app.bundle.staged")
        assets.open("index.android.bundle").use { input ->
          staged.outputStream().use { output -> input.copyTo(output) }
        }
        if (!staged.renameTo(bundle)) {
          staged.delete()
          return null
        }
        stamp.writeText(installed)
      }

      bundle.absolutePath
    } catch (err: Exception) {
      // Never fail to boot over OTA plumbing: fall back to the embedded bundle.
      null
    }
  }
`

function findMainApplication(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (name === 'MainApplication.kt') return full
    if (fs.statSync(full).isDirectory()) {
      const found = findMainApplication(full)
      if (found) return found
    }
  }
  return null
}

// Index of the ')' closing the call that starts at `open`, ignoring line comments
// (the generated packageList block contains a commented-out `add(...)` call).
function findCallEnd(contents, open) {
  let depth = 0
  for (let i = open; i < contents.length; i++) {
    if (contents[i] === '/' && contents[i + 1] === '/') {
      i = contents.indexOf('\n', i)
      if (i === -1) break
      continue
    }
    if (contents[i] === '(') depth++
    else if (contents[i] === ')' && --depth === 0) return i
  }
  return -1
}

module.exports = function withPearOtaAndroid(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      if (config.modRequest.introspect) return config

      const javaDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/java')
      const mainApplication = findMainApplication(javaDir)
      if (!mainApplication) throw new Error('with-pear-ota-android: MainApplication.kt not found')

      let contents = fs.readFileSync(mainApplication, 'utf8')
      if (contents.includes(MARKER) || contents.includes(UPSTREAM_MARKER)) return config

      const anchor = contents.indexOf(ANCHOR)
      if (anchor === -1) {
        throw new Error(
          `with-pear-ota-android: no ${ANCHOR} call in ${mainApplication} — the OTA bundle ` +
            'path cannot be wired up, so release builds would silently ignore Pear updates. ' +
            'Update this plugin for the React Native / Expo version in use.'
        )
      }

      const open = anchor + ANCHOR.length - 1
      const close = findCallEnd(contents, open)
      if (close === -1) {
        throw new Error(`with-pear-ota-android: unbalanced ${ANCHOR} call in ${mainApplication}`)
      }

      // Append the argument after the last existing one, keeping the call's
      // closing paren and its indentation where they are.
      let insertAt = close
      while (/\s/.test(contents[insertAt - 1])) insertAt--
      contents =
        contents.slice(0, insertAt) +
        ',\n      jsBundleFilePath = pearOtaBundlePath()' +
        contents.slice(insertAt)

      if (!contents.includes('import java.io.File')) {
        contents = contents.replace(/^(package\s+[\w.]+\s*\n)/m, '$1\nimport java.io.File\n')
      }

      // Class body ends at the file's last brace.
      const classEnd = contents.lastIndexOf('}')
      contents = contents.slice(0, classEnd) + OTA_FUNCTION + contents.slice(classEnd)

      fs.writeFileSync(mainApplication, contents)
      return config
    }
  ])
}
