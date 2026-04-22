# Acalmeme App

Acalmeme is a mental wellness and meditation app designed to help users relax, build healthy habits, and improve emotional well-being.

## 🚀 Technologies
React + TypeScript (Vite)
Tailwind CSS
Supabase
React Router, React Query e Radix UI

## 📱 Features
- Meditation-focused experience
- Calm and intuitive interface
- Daily wellness support
- Habit and reminder concept

## 🎯 Goal
Create a digital wellness product with a clean experience focused on relaxation and daily self-care.

## 🚧 Project Status
In development / Completed / Prototype

## 👨‍💻 Author
Developed by Thomas Henrique Pacheco Maizonave

## Mobile Billing

Web checkout continues to use Stripe.

For iOS and Android store releases, the app now expects RevenueCat + native store billing:

- `VITE_REVENUECAT_APPLE_API_KEY`
- `VITE_REVENUECAT_GOOGLE_API_KEY`
- `VITE_REVENUECAT_ENTITLEMENT_ID`
- `VITE_REVENUECAT_OFFERING_ID`

Supabase Edge Functions also require:

- `REVENUECAT_WEBHOOK_AUTH`
- `REVENUECAT_ENTITLEMENT_ID`

Then configure RevenueCat's webhook to call:

- `/functions/v1/revenuecat-webhook`

Store-side setup that still needs to be completed manually:

- Enable the `In-App Purchase` capability for the iOS target in Xcode / Apple Developer.
- Create the subscription product in App Store Connect.
- Create the subscription and base plan in Google Play Console.
- Map both store products to the same RevenueCat entitlement and offering.
