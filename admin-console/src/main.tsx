import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { enableMocking } from '@/testing/mocks/enable-mocking';
import '@/styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

// Start the MSW mock backend before the first render so no request races it.
enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
