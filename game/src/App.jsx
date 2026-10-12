
import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell.jsx';
import Home from './routes/Home.jsx';
import NotFound from './routes/NotFound.jsx';
import Setup from './routes/Setup.jsx';
import Play from './routes/Play.jsx';
import Play2 from './routes/Play2.jsx';
import Play3 from './routes/Play3.jsx';
import PlayMulti from './routes/PlayMulti.jsx';
import SuddenDeath from './routes/SuddenDeath.jsx';

import SporclePlay from './routes/Sporcle/Play.jsx';
import SporcleResult from './routes/Sporcle/Result.jsx';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/"       element={<Home />} />
        <Route path="/setup"  element={<Setup />} />
        <Route path="/play"  element={<Play />} />
        <Route path="/play-two" element={<Play2 />} />
        <Route path="/play-three" element={<Play3 />} />


        <Route path="/play-multi" element={<PlayMulti />} />
        <Route path="/sudden-death" element={<SuddenDeath />} />


        <Route path="/sporcle/play/:code" element={<SporclePlay />} />
        <Route path="/sporcle/result/:code" element={<SporcleResult />} />


        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}