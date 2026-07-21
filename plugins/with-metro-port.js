'use strict'

// Pins the Metro dev-server port this app connects to in DEBUG builds.
//
// Why: this is a prebuilt-React-Native app with no expo-dev-client, so the debug
// binary connects to Metro on React Native's compiled-in default port 8081
// (RCTBundleURLProvider's RCT_METRO_PORT macro, baked into the prebuilt framework
// and therefore not changeable via a build setting). When another React Native
// project already holds 8081, this app silently downloads THAT project's JS bundle,
// which surfaces as:
//   TurboModuleRegistry.getEnforcing('PlatformConstants') could not be found.
// Setting `jsLocation` at runtime overrides the baked-in port so we always talk to
// our own Metro on a dedicated port.
//
// Runs AFTER pear-runtime-react-native/plugin (which owns bundleURL()) and is
// idempotent, so it survives repeated `expo prebuild` / `expo run:ios`.

const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const METRO_PORT = 8099
const MARKER = '// snake-mobile: pin Metro dev-server port'

module.exports = function withMetroPort(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const root = config.modRequest.platformProjectRoot
      const name = config.modRequest.projectName || 'PearSnake'
      const appDelegate = path.join(root, name, 'AppDelegate.swift')
      if (!fs.existsSync(appDelegate)) return config

      let contents = fs.readFileSync(appDelegate, 'utf8')
      if (contents.includes(MARKER)) return config

      const anchor = 'return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot:'
      if (!contents.includes(anchor)) return config

      const injection =
        `${MARKER}\n` +
        `    RCTBundleURLProvider.sharedSettings().jsLocation = "localhost:${METRO_PORT}"\n` +
        '    '
      contents = contents.replace(anchor, injection + anchor)
      fs.writeFileSync(appDelegate, contents)
      return config
    }
  ])
}
