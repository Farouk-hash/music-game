// src/routes/QuranReciters.jsx
import { useState } from 'react';
import { useQuranReciters } from '../hooks/quran/useQuranReciters';
import { useReciterAdmin } from '../hooks/quran/useReciterAdmin';
import { useAlphabeticalGroups } from '../hooks/useAlphabeticalGroups';
import { ReciterGrid } from '../components/domain/ReciterGrid';
import { ArtistModalFields } from '../components/domain/ArtistModalFields';
import { AlphabetFilter } from '../components/ui/AlphabetFilter';
import { SearchBar } from '../components/ui/SearchBar';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { BackLink } from '../components/layout/BackLink';
import { ModalForm } from '../components/Modal/ModalForm';

export default function QuranReciters() {
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState(null);

  const { reciters, count, loading, error } = useQuranReciters({ search });

  // Admin state — publish/edit/delete reciters
  const admin = useReciterAdmin();

  const groups = useAlphabeticalGroups(reciters, { key: 'name' });
  const letters = groups.map(g => g.letter);
  const visible = activeLetter
    ? groups.find(g => g.letter === activeLetter)?.items ?? []
    : reciters;

  if (loading && !reciters.length) {
    return <LoadingBlock label="Loading reciters…" />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load"
        description={error.message}
      />
    );
  }

  const modalTitle = admin.isEditMode ? 'Edit Reciter' : 'Publish Reciter';

  return (
    <div className="space-y-6">
      <BackLink to="/">Home</BackLink>

      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">القرآن الكريم</h1>
            <p className="text-sm text-ink-muted mt-1">
              {count} {count === 1 ? 'reciter' : 'reciters'} · source: mp3quran.net
            </p>
            <p className="text-xs text-ink-subtle mt-1">
              Click View to browse surahs. Click Publish to add a reciter to Cloudflare.
            </p>
          </div>
          <Badge variant="warning">📖 Quran</Badge>
        </div>

        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchBar
            initialValue={search}
            onSubmit={setSearch}
            placeholder="ابحث عن قارئ…"
            submitLabel="Search"
          />
        </div>

        {letters.length > 1 && (
          <AlphabetFilter
            letters={letters}
            active={activeLetter}
            onSelect={setActiveLetter}
          />
        )}
      </header>

      {visible.length === 0 ? (
        <EmptyState
          icon="🔎"
          title={activeLetter ? `No reciters starting with "${activeLetter}"` : 'No reciters'}
        />
      ) : (
        <ReciterGrid
          reciters={visible}
          publishedNames={admin.publishedByNameIds}
          pendingIds={admin.pendingIds}
          onPublish={admin.openFor}
          onDelete={admin.removeReciter}
        />
      )}

      {/* Publish / Edit modal — reuses ArtistModalFields for the genre dropdown */}
      <ModalForm
        open={admin.isModalOpen}
        onClose={admin.close}
        title={modalTitle}
        submitLabel={admin.isEditMode ? 'Save Changes' : 'Publish'}
        submitting={admin.submitting}
        error={admin.modalError}
        onSubmit={admin.submit}
      >
        <ArtistModalFields
          form={admin.form}
          setForm={admin.setForm}
          isEditMode={admin.isEditMode}
          genreOptions={admin.genreOptions}
        />
      </ModalForm>
    </div>
  );
}