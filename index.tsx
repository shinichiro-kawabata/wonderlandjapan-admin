import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Critical: Root element not found");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Wonderland Admin: React successfully mounted.");
  } catch (err) {
    console.error("React Render Error:", err);
    rootElement.innerHTML = `<div style="padding:40px; color:red;">Render Error: ${err.message}</div>`;
  }
}