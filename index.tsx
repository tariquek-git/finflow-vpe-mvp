
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const RESET_QUERY_PARAM = 'fresh';
const RESET_STORAGE_PREFIXES = ['fof:', 'finflow-builder.'];

const resetPersistentStateIfRequested = () => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const shouldReset = url.searchParams.get(RESET_QUERY_PARAM) === '1';
  if (!shouldReset) return;

  const clearByPrefix = (storage: Storage) => {
    for (const key of Object.keys(storage)) {
      if (RESET_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        storage.removeItem(key);
      }
    }
  };

  try {
    clearByPrefix(window.localStorage);
    clearByPrefix(window.sessionStorage);
  } catch {
    // Ignore browser storage failures and continue boot.
  }

  url.searchParams.delete(RESET_QUERY_PARAM);
  const query = url.searchParams.toString();
  const nextUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
  window.history.replaceState({}, '', nextUrl);
};

resetPersistentStateIfRequested();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
