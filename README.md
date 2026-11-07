# SolvaCube 🧩

**SolvaCube** is a production-quality Android application built with **Expo (React Native)** and **TypeScript** that solves twisty puzzles step by step. Users paint their physical puzzle's stickers onto an interactive 2D unfolded net, and SolvaCube validates the state (detecting impossible piece swaps, twisted corners, flipped edges, or duplicate pieces) and computes an animated, beginner-friendly solution.

---

## 📱 Features

- **Phase 1 Puzzles**:
  - **3x3 Rubik's Cube**: Powered by the Kociemba two-phase optimal algorithm via `cubejs`, initialized asynchronously at app start.
  - **2x2 Pocket Cube**: Bidirectional search solving all states in optimal/near-optimal moves across structured stages.
  - **Pyraminx (Tetrahedron)**: Intuitive 3-stage solver (Tips $\rightarrow$ Centres $\rightarrow$ Edges) finding solutions in $\le 11$ moves.
- **Extensible Architecture**: Built on a unified, modular `Puzzle<TState>` interface (`getFaces()`, `validate()`, `solve()`, `applyMove()`, `scramble()`). New puzzles (4x4, Skewb, Megaminx) can be added as plugins without altering the UI.
- **Interactive Colour Input**:
  - Unfolded net representations (cross layout for cubes, 4 triangles for Pyraminx).
  - Floating 6-color palette (4 for Pyraminx) with live count indicators (e.g. `White 7/9`) and over/under-count alerts.
  - Fixed pre-coloured centres on 3x3 ensuring correct orientation (*"Hold the cube with White on top and Green facing you"*).
  - Auto-advance to the next sticker upon painting.
  - "Reset", "Undo", and "Fill sample scrambled cube" buttons.
- **Validation Engine**:
  - Validates colour frequency, corner and edge physical integrity, impossible colour pairings, corner twist parity, edge flip parity, and permutation parity before solving.
  - Returns friendly, specific guidance (e.g., *"The red-white edge appears twice. Please recheck your stickers"*).
- **Solution Player**:
  - Animated 2D unfolded net highlighting the active face being turned with directional arrows (CW, CCW, 180°).
  - Plain-English instructions (e.g., *"Turn the RIGHT face clockwise 90°"*) alongside standard notation (`R`, `U'`, `F2`).
  - Controls: Previous, Next, Play/Pause (auto-advance timer), Speed selector (0.5x, 1x, 1.5x, 2x), and Restart.
  - Moves grouped into titled stages.
  - "Solved! 🎉" celebration screen with animated confetti, move count, and Play Store rating shortcuts.
- **Accessibility & Settings**:
  - Colour-blind friendly high-contrast palette option (Okabe-Ito/Wong palette) with letter overlays (`W`, `Y`, `G`, `B`, `R`, `O`) on stickers and swatches.
  - Sound effects toggle, haptic feedback toggle, dark mode toggle.
  - Local state persistence using `@react-native-async-storage/async-storage` (never loses progress).
- **Google Play & AdMob Policy Compliant**:
  - Official test ad unit IDs in development.
  - Adaptive banners at the bottom of Home and Colour Input screens only (never near the Solve button or palette).
  - Interstitial ads displayed strictly on the "Solved" screen with an enforced minimum 3-minute gap.
  - Google UMP (User Messaging Platform) GDPR/EEA consent form integrated before ad requests.
  - Non-blocking, offline-first architecture with React Error Boundaries.

---

## 🛠 Tech Stack

- **Framework**: Expo SDK 52 (React Native 0.76)
- **Language**: TypeScript (Strict Mode)
- **Navigation**: Expo Router v4
- **State Management**: Zustand v5
- **Animations**: React Native Reanimated v3
- **Monetization**: `react-native-google-mobile-ads` (AdMob + UMP Consent)
- **Solvers**:
  - 3x3: `cubejs` (Two-Phase Kociemba)
  - 2x2: Bidirectional search
  - Pyraminx: Direct stage & bidirectional search
- **Testing**: Jest + `ts-jest`

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js $\ge 18$
- npm or yarn
- Expo Go app on your physical Android device or an Android Studio emulator

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install --legacy-peer-deps
```

### 2. Running Unit Tests
SolvaCube comes with a comprehensive Jest test suite, including automated validation of **200 random scrambles each** for 3x3, 2x2, and Pyraminx:
```bash
npm test
```

### 3. Running the App Locally
Start the Expo development server:
```bash
npm run start
# Or to target Android directly:
npm run android
```
Scan the QR code with the Expo Go app on your Android device.

---

## 💰 How to Swap Test AdMob IDs for Production

In development, SolvaCube uses Google's official test ad units (`TestIds.ADAPTIVE_BANNER`, `TestIds.INTERSTITIAL`, `TestIds.REWARDED`) to prevent accidental policy violations.

When you are ready to publish on Google Play:

1. Open `src/services/adService.ts`:
   ```typescript
   export const AD_CONFIG = {
     USE_TEST_IDS: false, // Set to false for production
     PRODUCTION_IDS: {
       BANNER: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',       // Your real AdMob Banner ID
       INTERSTITIAL: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // Your real AdMob Interstitial ID
       REWARDED: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',     // Your real AdMob Rewarded ID
     },
     MIN_INTERSTITIAL_GAP_MS: 3 * 60 * 1000,
   };
   ```

2. Open `app.json` and replace the test `androidAppId` with your real AdMob App ID:
   ```json
   "plugins": [
     "expo-router",
     [
       "react-native-google-mobile-ads",
       {
         "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
       }
     ]
   ]
   ```

---

## 📦 Building the Android App Bundle (.aab) with EAS

To build a release-ready `.aab` file for Google Play Console submission:

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```bash
   eas login
   ```

3. Configure your project:
   ```bash
   eas project:init
   ```

4. Build the production Android App Bundle:
   ```bash
   eas build --platform android --profile production
   ```
   EAS will compile the native code in the cloud and provide a download link for the signed `.aab` bundle.

---

## 📋 Google Play Store Release Checklist

Before submitting SolvaCube to Google Play Console, complete the following requirements:

### 1. Store Listing & Metadata
- [ ] **App Title**: SolvaCube - Twisty Puzzle Solver
- [ ] **Short Description**: Step-by-step 3D & 2D solver for 3x3, 2x2 cubes & Pyraminx with animated moves.
- [ ] **Full Description**: Clear description detailing beginner-friendly solution steps, color input guide, notation tips, and offline capability.
- [ ] **App Icon**: 512x512 PNG (provided in `./assets/icon.png`).
- [ ] **Feature Graphic**: 1024x500 JPEG/PNG showing SolvaCube in action.
- [ ] **Phone & Tablet Screenshots**: At least 4 screenshots highlighting Home, Colour Input, Solution Player, and How to Hold guide.

### 2. Privacy Policy & Legal
- [ ] Host the Privacy Policy online (e.g. at `https://solvacube.app/privacy-policy.html` or on GitHub Pages).
- [ ] Enter the public Privacy Policy URL in the Console under **App Content > Privacy Policy**.
- [ ] In `app/settings.tsx`, verify the privacy policy link points to your hosted URL.

### 3. Google Play Data Safety Form
- [ ] **Data Collected**:
  - Diagnostics: Crash logs & app performance diagnostics (collected by Google Mobile Ads SDK).
  - Device/Other IDs: Advertising ID (collected by Google AdMob for ad serving and fraud prevention).
- [ ] **Data Shared**:
  - Shared with Google AdMob for advertising and analytics.
- [ ] **Security Practices**:
  - Data encrypted in transit (HTTPS/TLS).
  - Users can request deletion through Google account ad settings.

### 4. Ads Declaration
- [ ] Under **App Content > Ads**, select **"Yes, my app contains ads"**.
- [ ] Ensure ad placements follow Google Play Better Ads Guidelines (no popups during gameplay, no unexpected interstitials on launch or mid-solve, minimum 3-minute gap enforced by `adService.ts`).

### 5. Content Rating & Target Audience
- [ ] Complete the IARC Content Rating questionnaire (Puzzle / Educational category). Expected rating: **PEGI 3 / Everyone**.
- [ ] Under **Target Audience and Content**, select **Ages 13 and older** (simplifies COPPA / Families policy requirements regarding AdMob).

### 6. Closed Testing Requirement (Personal Accounts)
- [ ] Google Play requires newly created personal developer accounts to run a closed test with at least **20 testers opted in for at least 14 days** before applying for production access.
- [ ] Create a Closed Testing track, upload the `.aab`, recruit 20 testers via an email group, and keep them active for 14 days.

---

## 📄 License

MIT © SolvaCube Team

