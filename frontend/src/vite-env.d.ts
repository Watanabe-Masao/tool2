/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Allow CSS imports
declare module '*.css' {
  const content: string;
  export default content;
}
