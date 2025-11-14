import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';
import './index.css'
import { NotificationsProvider } from './context/NotificationsContext.tsx';
import { UserProvider } from './context/UserContext.tsx';
import { router } from './router'; // Assurez-vous que ce chemin est correct

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <NotificationsProvider>
        <RouterProvider router={router} />
      </NotificationsProvider>
    </UserProvider>
  </StrictMode>,
)
