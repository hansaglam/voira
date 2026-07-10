# EchoSpeak

AI-powered English shadowing and speaking confidence app for Turkish users.

## Tech Stack

- React Native + Expo (TypeScript)
- React Navigation (Stack + Bottom Tabs)
- Mock data (no backend, AI, or payments yet)

## Getting Started

```bash
npm install
npm start
```

Then scan the QR code with Expo Go, or press `a` for Android / `i` for iOS simulator.

## App Flow

1. **Onboarding** — Welcome → Level → Goal → Daily practice → First speaking test
2. **Main tabs** — Ana Sayfa, Kategoriler, Gelişim, Profil
3. **Lesson flow** — Shadowing practice → Analysis result
4. **Premium** — SpeakPlus paywall (mock)

## Project Structure

```
src/
  components/   # Reusable UI components
  constants/    # Options and labels
  context/      # User state (ready for Firebase)
  data/         # Mock lessons and progress
  navigation/   # Stack and tab navigators
  screens/      # All app screens
  theme/        # Colors, typography, spacing
  types/        # TypeScript interfaces
```

## Future Integrations

Structure is prepared for:
- Firebase (auth, user data)
- RevenueCat (SpeakPlus subscriptions)
- AI analysis (pronunciation, fluency, rhythm scoring)
