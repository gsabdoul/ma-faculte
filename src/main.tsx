import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { NotificationsProvider } from './context/NotificationsContext.tsx';
import { UserProvider } from './context/UserContext.tsx';
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </UserProvider>
  </StrictMode>,
)
