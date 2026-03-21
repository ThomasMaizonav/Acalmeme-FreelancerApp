import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import { LanguageProvider } from "./i18n/language.tsx";
import "./index.css";

const isNativeApp = Capacitor.isNativePlatform();
document.body.classList.add(isNativeApp ? "app-native" : "app-web");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
