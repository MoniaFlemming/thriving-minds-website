import { createRoot, hydrateRoot } from 'react-dom/client';
import type { ErrorInfo } from 'react';

import App from './App';

import './index.css';
import './technical.css';

const rootElement = document.getElementById('root')!;
const rootOptions = {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error: unknown, errorInfo: ErrorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
};
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, <App />, rootOptions);
} else {
  createRoot(rootElement, rootOptions).render(<App />);
}
