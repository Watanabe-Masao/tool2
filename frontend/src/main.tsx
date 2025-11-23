import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Splide CSS */
// @ts-ignore - CSS import
import '@splidejs/react-splide/css/core';

/* Custom CSS */
import './index.css';
import App from './App.tsx';

// PWA Service Worker registration
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('新しいバージョンが利用可能です。更新しますか？')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('アプリがオフラインで利用可能になりました');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
