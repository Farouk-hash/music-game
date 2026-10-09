// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Home from './routes/Home';
import GenrePicker from './routes/GenrePicker';
import ArtistList from './routes/ArtistList';
import AllArtists from './routes/AllArtists';
import ArtistDetail from './routes/ArtistDetail';
import AlbumDetail from './routes/AlbumDetails';
import PublishedArtists from './routes/PublishedArtists';    
import NotFound from './routes/NotFound';
import PublishedGenres from './routes/PublishedGenres';
import PublishedTracks from './routes/PublishedTracks';
import QuranReciters from './routes/QuranReciters';
import QuranReciterDetail from './routes/QuranReciterDetail';
import PublishedUpload from './routes/PublishedUploads';
import PublishedLyrics from './routes/PublishedLyrics';
import PublishedAlbumaty from './routes/PublishedAlbumaty';
import PublishedAlbumYears from './routes/PublishedAlbumYears';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/"                    element={<Home />} />
        <Route path="/genres"              element={<GenrePicker />} />
        <Route path="/genres/:slug"        element={<ArtistList />} />
        <Route path="/artists"             element={<AllArtists />} />
        <Route path="/artists/:slug"       element={<ArtistDetail />} />
        <Route path="/albums/:id"          element={<AlbumDetail />} />
        <Route path="/published/artists"   element={<PublishedArtists />} />   
        <Route path="/published/genres"  element={<PublishedGenres />} />
        <Route path="/published/tracks" element={<PublishedTracks />} />

        <Route path="/quran"        element={<QuranReciters />} />
        <Route path="/quran/:id"    element={<QuranReciterDetail />} />
        

        <Route path="/published/upload" element={<PublishedUpload />} />

        <Route path="/published/lyrics" element={<PublishedLyrics />} />
        <Route path="/published/albumaty" element={<PublishedAlbumaty />} />
        <Route path="/published/album-years" element={<PublishedAlbumYears />} />

        <Route path="*"                    element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}