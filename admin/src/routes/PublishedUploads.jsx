// src/routes/PublishedUpload.jsx
import { useState, useMemo } from 'react';
import AppShell from '../components/layout/AppShell';
import { Container } from '../components/layout/Container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArtistModalFields } from '../components/domain/ArtistModalFields';
import { PublishClipsModal } from '../components/domain/PublishClipsModal';
import { useCloudflareArtists } from '../hooks/cloud-flare/useCloudflareArtists';
import { useCloudflareGenres } from '../hooks/cloud-flare/useCloudflareGenres';
import { usePublishUpload } from '../hooks/cloud-flare/usePublishUpload';

const EMPTY_NEW_ARTIST = { id: '', name: '', genre_ids: [], image: '' };

export default function PublishedUpload() {
  const [files, setFiles] = useState([]);
  const [artistMode, setArtistMode] = useState('existing');
  const [artistId, setArtistId] = useState('');
  const [newArtistForm, setNewArtistForm] = useState(EMPTY_NEW_ARTIST);
  const [modalOpen, setModalOpen] = useState(false);

  const { artists } = useCloudflareArtists({});
  const { genres: cfGenres } = useCloudflareGenres();
  const genreOptions = useMemo(
    () => cfGenres.map(g => ({ value: g.id, label: g.display_name || g.name })),
    [cfGenres]
  );

  const upload = usePublishUpload();

  const canSubmit =
    files.length > 0 &&
    (artistMode === 'existing'
      ? !!artistId
      : newArtistForm.id.trim() !== '' &&
        newArtistForm.name.trim() !== '' &&
        newArtistForm.genre_ids.length > 0);

  function handleFilesChange(e) {
    setFiles(Array.from(e.target.files ?? []));
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function handleOpenModal() {
    upload.reset();
    setModalOpen(true);
  }

  function handleCloseModal() {
    if (upload.isPending) return;
    setModalOpen(false);
    if (upload.data?.ok) {
      setFiles([]);
      setArtistId('');
      setNewArtistForm(EMPTY_NEW_ARTIST);
    }
    upload.reset();
  }

  function handlePublishUpload({ files: uploadList, positions }) {
    const payload = {
      files: uploadList,
      positions,            // array of { position, enabled, duration, forward, reversed }
      label: null,
    };

    if (artistMode === 'existing') {
      payload.artistId = Number(artistId);
      payload.newArtist = null;
    } else {
      payload.artistId = null;
      payload.newArtist = {
        id: Number(newArtistForm.id),
        name: newArtistForm.name.trim(),
        genre_ids: newArtistForm.genre_ids,
        image: newArtistForm.image.trim() || null,
      };
    }

    upload.mutate(payload);
  }

  const syntheticTracks = useMemo(
    () =>
      files.map((f, i) => ({
        id: `upload-${i}`,
        name: f.name.replace(/\.[^.]+$/, ''),
        displayName: f.name.replace(/\.[^.]+$/, ''),
        src: f,
        duration: 0,
        artistId: artistMode === 'existing' ? Number(artistId) : null,
      })),
    [files, artistMode, artistId]
  );

  const uploadFilesMap = useMemo(
    () => new Map(syntheticTracks.map((t, i) => [t.id, files[i]])),
    [syntheticTracks, files]
  );

  return (
    <AppShell>
      <Container>
        <h1 className="text-2xl font-semibold text-ink mb-6">Upload clips</h1>

        <Card className="p-6 space-y-5 max-w-2xl">
          <div>
            <label className="block text-sm text-ink-muted mb-1">
              Audio files <span className="text-ink-subtle">(one or many)</span>
            </label>
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFilesChange}
              className="block w-full text-sm text-ink-muted
                         file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
                         file:bg-brand-600 file:text-white hover:file:bg-brand-500"
            />

            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs text-ink-subtle"
                  >
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="tabular-nums">
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-danger hover:underline"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="artistMode"
                checked={artistMode === 'existing'}
                onChange={() => setArtistMode('existing')}
              />
              Existing artist
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="artistMode"
                checked={artistMode === 'new'}
                onChange={() => setArtistMode('new')}
              />
              Create new artist
            </label>
          </div>

          {artistMode === 'existing' ? (
            <div>
              <label className="block text-sm text-ink-muted mb-1">Artist</label>
              <select
                value={artistId}
                onChange={e => setArtistId(e.target.value)}
                className="w-full bg-surface-subtle border border-surface-border
                           rounded px-3 py-2 text-ink"
              >
                <option value="">— pick an artist —</option>
                {artists.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (ID {a.id})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3 p-3 rounded-lg border border-surface-border bg-surface-muted">
              <p className="text-xs font-medium text-ink-muted">New artist details</p>
              <ArtistModalFields
                form={newArtistForm}
                setForm={setNewArtistForm}
                isEditMode={false}
                genreOptions={genreOptions}
              />
            </div>
          )}

          {upload.isError && (
            <p className="text-sm text-danger">
              {upload.error?.message ?? 'Upload failed'}
            </p>
          )}

          <Button onClick={handleOpenModal} disabled={!canSubmit}>
            Configure {files.length > 1 ? `${files.length} files` : 'clips'} →
          </Button>
        </Card>

        {modalOpen && syntheticTracks.length > 0 && (
          <PublishClipsModal
            open={modalOpen}
            onClose={handleCloseModal}
            tracks={syntheticTracks}
            artistId={artistMode === 'existing' ? Number(artistId) : null}
            onPublish={() => {}}
            uploadFiles={uploadFilesMap}
            onPublishUpload={handlePublishUpload}
            publishing={upload.isPending}
            result={upload.data}
            error={upload.isError ? (upload.error?.message ?? 'Upload failed') : null}
            onReset={upload.reset}
          />
        )}
      </Container>
    </AppShell>
  );
}