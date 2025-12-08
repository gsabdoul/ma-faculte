import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css'
import { NotificationsProvider } from './context/NotificationsContext.tsx';
import { UserProvider } from './context/UserContext.tsx';
import { router } from './router'; // Assurez-vous que ce chemin est correct

// Créez une instance de QueryClient
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <NotificationsProvider>
          <RouterProvider router={router} />
        </NotificationsProvider>
      </UserProvider>
    </QueryClientProvider>
  </StrictMode>,
)
