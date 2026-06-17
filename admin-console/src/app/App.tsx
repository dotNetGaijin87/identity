import { RouterProvider } from 'react-router-dom';
import { AppProvider } from '@/providers/app-provider';
import { router } from './router';

export function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
