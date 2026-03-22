import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { checkDatabaseVersion, resetDatabase } from './db/resetDb';
import { seedDatabase } from './db/seed';

// Development helpers
if (import.meta.env.DEV) {
  checkDatabaseVersion();
  // Make resetDatabase and seedDatabase available in console
  (window as any).resetDatabase = resetDatabase;
  (window as any).seedDatabase = seedDatabase;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
