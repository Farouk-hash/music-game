
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {  QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { queryClient } from './lib/queryClient.js';
import { GameSettingsProvider } from './context/GameSettingsContext.jsx';
import { ProfileProvider } from './context/ProfileContext.jsx';



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
       <ProfileProvider>
        <GameSettingsProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </GameSettingsProvider>
       </ProfileProvider>
    </QueryClientProvider>
  </StrictMode>
);