
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {  QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { queryClient } from './lib/queryClient.js';
import { GameSettingsProvider } from './context/GameSettingsContext.jsx';



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GameSettingsProvider>

        <BrowserRouter>
          <App />
        </BrowserRouter>
      </GameSettingsProvider>
    </QueryClientProvider>
  </StrictMode>
);