// game/src/context/ProfileContext.jsx
import { createContext, useContext } from 'react';
import { useProfile } from '../hooks/profiles/useProfile';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const value = useProfile();
  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfileContext must be used inside <ProfileProvider>');
  return ctx;
}