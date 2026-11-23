// game/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell.jsx';
import { OnlineOnly } from '@/components/network/OnlineOnly.jsx';
import { ToastHost } from '@/hooks/ui/useToast';
import Home from '@/routes/Home.jsx';
import NotFound from '@/routes/NotFound.jsx';
import Setup from '@/routes/Setup.jsx';
import Play from '@/routes/PlayLevels/Play.jsx';
import Play2 from '@/routes/PlayLevels/Play2.jsx';
import Play3 from '@/routes/PlayLevels/Play3.jsx';
import PlayMulti from '@/routes/PlayMulti/PlayMulti.jsx';
import SuddenDeath from '@/routes/SuddenDeath/SuddenDeath.jsx';

import SporclePlay from '@/routes/Sporcle/Play.jsx';
import SporcleResult from '@/routes/Sporcle/Result.jsx';
import Library from '@/routes/Library/Library.jsx';
import LibraryOthers from '@/routes/Library/LibraryOthers';
import StreakChallenge from './routes/Streak/Challenge';
import StreakResult from './routes/Streak/Result';
import StreakHub from './routes/Streak/Hub';
import Templates from './routes/Templates/Templates';

// Pages that need the network to load or play. Everything else (Home, Setup,
// Library, Templates, ...) stays reachable offline and relies on cached data.
const online = (element) => <OnlineOnly>{element}</OnlineOnly>;

export default function App() {
  return (
    <>
      <Shell>
        <Routes>
          <Route path="/"       element={<Home />} />
          <Route path="/setup"  element={<Setup />} />

          {/* Game modes: need rounds + audio from the API */}
          <Route path="/play"         element={online(<Play />)} />
          <Route path="/play-two"     element={online(<Play2 />)} />
          <Route path="/play-three"   element={online(<Play3 />)} />
          <Route path="/play-multi"   element={online(<PlayMulti />)} />
          <Route path="/sudden-death" element={online(<SuddenDeath />)} />
          <Route path="/sporcle/play/:code"    element={online(<SporclePlay />)} />
          <Route path="/streak/play/:genreKey" element={online(<StreakChallenge />)} />

          <Route path="/sporcle/result/:code"   element={<SporcleResult />} />
          <Route path="/library"        element={<Library />} />
          <Route path="/library/:id"    element={<Library />} />
          <Route path="/library/others" element={<LibraryOthers />} />

          <Route path="/streak" element={<StreakHub />} />
          <Route path="/streak/result/:genreKey" element={<StreakResult />} />

          <Route path="/templates" element={<Templates />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
      <ToastHost />
    </>
  );
}