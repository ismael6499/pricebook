# PriceBook 🛒📱

[![React Native](https://img.shields.io/badge/React%20Native-0.76+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2052+-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-Offline--First-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**PriceBook** is a modern, privacy-focused, offline-first mobile application built with **React Native** and **Expo**. It is designed to track retail grocery prices, detect inflation patterns and shrinkflation tricks, manage habitual monthly consumption baskets, and simplify family expense settlements.

---

## ✨ Key Features

### 📴 100% Offline-First & Private
- All your data is stored locally on your device in a high-performance **SQLite** database (`expo-sqlite`).
- Zero mandatory cloud dependencies, no accounts, and no data tracking.
- Works seamlessly without an internet connection.

### 📊 Real Price Tracking & Inflation Analytics
- Record purchases or price-check reference entries ($0 debt impact).
- Real-time price variation indicators (percentage increases/decreases vs previous purchases).
- Categorize items with custom color-coded categories and icons.
- High-resolution product photo attachments with fullscreen preview viewer.

### ⚖️ Unit, Weight & Volume Calculator (Shrinkflation Detector)
- Instantly compare unit prices to reveal misleading packaging sizes:
  - **Weight:** Cost per 100g and per 1 kg.
  - **Volume:** Cost per 100ml and per 1 Liter (detects 900ml vs 1L deception).
  - **Units / Packs:** Cost per individual item (e.g. egg trays vs 6-packs, multi-pack beers).

### 🗓️ Habitual Monthly Plan & Spending Homologator
- Plan recurring consumption with flexible frequency formulas:
  - **Daily, Weekly, Biweekly, Monthly, or Every $N$ Days**.
  - **Alternating Schedules:** Select active days of the week (e.g., Mon-Wed-Fri) and daily units to avoid double-budgeting alternating snacks/fruits.
- **1-Tap Purchase Generation:** Convert your entire habitual plan into real pending purchases with a single tap.

### 🤝 Monthly Settlements & Family Repayments
- Track purchases made on your behalf by buyers (e.g., parents, roommates).
- One-tap monthly settlement closures with custom payment methods (Transfer, Cash, etc.).
- Settlement reversibility and full audit history.

### 💵 USD Exchange Rate Tracking
- Track the Argentinian USD Blue rate alongside purchases to monitor real inflation in hard currency.

### 🛡️ Rotary Backups & Google Drive Export
- Automated 7-day rolling local database backups.
- One-tap export to Google Drive or external storage via native Android share sheet.
- Complete JSON database backup and restore anytime.

### 🌐 Internationalization (i18n)
- Centralized multi-language dictionary architecture supporting **English (Default)** and **Español (Latin America)**.

---

## 🛠️ Tech Stack

- **Framework:** [Expo](https://expo.dev/) (SDK 52+) with [Expo Router](https://docs.expo.dev/router/introduction/)
- **Runtime:** [React Native](https://reactnative.dev/) (New Architecture ready)
- **Database:** [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (Embedded local SQLite)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Icons:** [@expo/vector-icons](https://icons.expo.fyi/) (Ionicons)
- **Styling:** React Native StyleSheet with custom dark/light theme tokens

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- [Expo Go](https://expo.dev/go) app installed on your Android device (or an Android emulator)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ismael6499/pricebook.git
   cd pricebook
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on your device:**
   - Scan the terminal QR code with the **Expo Go** app on your Android device connected to the same Wi-Fi network.
   - Or press `a` to launch on a connected Android device / emulator.

---

## 🧪 Testing & Verification

PriceBook includes an in-memory unit test suite covering schema migrations, debt safety, frequency engines, volume equivalences, and localization parity:

```bash
# Run unit tests
npm test

# Run TypeScript typecheck
npx tsc --noEmit

# Run UI & i18n localization audit
node tools/render_ui_tree.js --audit

# Diagnose Expo dependencies
npx expo-doctor
```

---

## 📦 Building a Standalone Android APK

PriceBook is pre-configured with **EAS Build** to generate standalone `.apk` files without needing local Android Studio or consuming laptop resources:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```bash
   eas login
   ```

3. Build the standalone APK:
   ```bash
   eas build -p android --profile preview
   ```

4. Once the build finishes, download the `.apk` directly to your phone via the provided QR code or link.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
