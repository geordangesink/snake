# Releasing

Store releases build on [EAS](https://expo.dev/eas) and go to TestFlight / Google Play internal testing via GitHub Actions.

## Flow

- **Release (manual only):** Actions → **Build Mobile Store Releases** → Run workflow → pick the ref (the `mobile` branch or a release tag) and the profile/platforms. It builds on EAS and, when **publish** is left on, submits those exact builds to TestFlight / Play internal testing after the build finishes. Untick **publish** for a build-only run. Preview builds are never submitted (internal-distribution artifacts aren't store-accepted).
- **(Re)submit an existing build:** Actions → **Publish Mobile Store Releases** → same ref rules — pass explicit EAS build IDs, or it takes the latest finished build for the profile.
- The copies of the two workflows on `main` only exist because GitHub reads the default branch for the Run-workflow button; a guard aborts runs on refs without the mobile release files.
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
