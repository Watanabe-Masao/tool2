import { createRoot } from 'react-dom/client';

/* Custom CSS */
import './index.css';
import App from './App.tsx';

// PWA Service Worker registration - 一時的に無効化
// import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with auto-update
/*const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('新しいバージョンが利用可能です。更新しますか？')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('アプリがオフラインで利用可能になりました');
  },
});*/

// React#185対策: StrictModeを一時的に無効化（AG Gridとの互換性問題）
// 本番環境では問題ないが、開発環境でReact#185エラーが発生する場合は
// StrictModeを無効化する
createRoot(document.getElementById('root')!).render(
  <App />
)
