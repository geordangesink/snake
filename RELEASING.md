# Releasing

Store releases build on [EAS](https://expo.dev/eas) and go to TestFlight / Google Play internal testing via GitHub Actions.

## Flow

- **Release:** bump `version` in package.json, commit on `mobile`, then `git tag v<version> && git push origin mobile v<version>`. The tag triggers **Build Mobile Store Releases** (both platforms, production); on success **Publish Mobile Store Releases** submits those exact builds automatically.
- **Manual runs:** Actions → pick a workflow → branch **`mobile`** — build-only runs, the preview profile, or (re)submitting an existing build. The copies of the two workflows on `main` only exist because GitHub reads the default branch for the Run-workflow button and the build→publish chaining; a guard aborts runs on any other ref.
- Store version comes from package.json (via app.config.js); build numbers are EAS-managed (`autoIncrement`).

## Secrets

Settings → Secrets and variables → Actions (or `gh secret set NAME`):

| Secret                             | Value                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`                       | expo.dev → Account settings → Access tokens                                               |
| `EAS_PROJECT_ID`                   | expo.dev → project → Project ID (UUID)                                                    |
| `APPLE_ID`                         | Apple developer account email                                                             |
| `APPLE_TEAM_ID`                    | developer.apple.com → Membership → Team ID (10 chars)                                     |
| `APPLE_ASC_APP_ID`                 | App Store Connect → app → App Information → Apple ID (numeric)                            |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | account.apple.com → Sign-In and Security → App-Specific Passwords                         |
| `GOOGLE_SERVICE_ACCOUNT_JSON`      | full JSON key of a GCP service account invited in Play Console (with release permissions) |

## Variables (optional)

Same place, Variables tab (or `gh variable set NAME`). CI injects these into app.json before building — use them to override the committed identifiers without touching the repo (e.g. building under a different account):

| Variable          | Value                                           |
| ----------------- | ----------------------------------------------- |
| `IOS_BUNDLE_ID`   | iOS bundle identifier registered with Apple     |
| `ANDROID_PACKAGE` | Android application ID used in the Play Console |

## One-time setup

- Bundle identifiers must be real — production builds refuse `com.anonymous.*`. Either commit them in app.json or set the variables above.
- iOS signing: run `npx eas-cli credentials --platform ios` locally (logged into the Expo account, real bundle ID in app.json) so EAS stores the distribution cert + provisioning profile. The Android keystore is auto-generated on the first build.
- The service account's GCP project needs the **Google Play Android Developer API** enabled.
- Google requires the **first `.aab` uploaded by hand**: run a build without publishing, download it from the EAS build page, upload it to an internal-testing release. Everything after that is automatic.
