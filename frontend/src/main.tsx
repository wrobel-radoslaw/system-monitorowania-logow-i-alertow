import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}
const root = createRoot(rootElement);

/** Starts the browser mocks when enabled. The import is dropped from production builds. */
async function enableMocks() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('@/shared/test/browser');
    await worker.start({ onUnhandledFrame: 'bypass' });
  }
}

void enableMocks()
  .catch((error: unknown) => console.error('Could not start the API mocks', error))
  .finally(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
