// game/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App.jsx';
import '@/index.css';
import { queryClient, persistOptions } from '@/lib/queryClient.js';
import { GameSettingsProvider } from '@/context/GameSettingsContext.jsx';
import { ProfileProvider } from '@/context/ProfileContext.jsx';
import { ToastProvider } from '@/hooks/ui/useToast';
import { ChallengeConfigProvider } from './context/ChallengeConfigContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ProfileProvider>
        <ChallengeConfigProvider>
          <GameSettingsProvider>
            <ToastProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ToastProvider>
          </GameSettingsProvider>
        </ChallengeConfigProvider>
      </ProfileProvider>
    </PersistQueryClientProvider>
  </StrictMode>
);