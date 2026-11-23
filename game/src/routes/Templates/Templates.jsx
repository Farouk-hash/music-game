// game/src/routes/Templates.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '@/hooks/templates/useTemplates.js';
import { parseYears } from '@/components/domain/Templates/templateYears';
import { usePagination } from '@/hooks/ui/usePagination.js';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Loader } from '@/components/ui/Loader.jsx';
import { EmptyBlock } from '@/components/domain/Rounds/EmptyBlock.jsx';
import { TemplateRow } from '@/components/domain/Templates/TemplateRow.jsx';
import { LevelPickerModal } from '@/components/domain/Collections/modal/LevelPickerModal.jsx';
import { Level1Modal } from '@/components/domain/Setup/Modals/Level1Modal.jsx';
import { Level2Modal } from '@/components/domain/Setup/Modals/Level2Modal.jsx';
import { Level3Modal } from '@/components/domain/Setup/Modals/Level3Modal.jsx';
import { useGameSettings } from '@/context/GameSettingsContext.jsx';
import { useCapabilityGates } from '@/hooks/setup/useCapabilityGates.js';
import { OfflineBlock } from '@/components/network/OfflineBlock';
import { IconWifiOff } from '@/icons';

export default function Templates() {
  const navigate = useNavigate();
  const settings = useGameSettings();

  const { templates, isLoading, error , refetch } = useTemplates();

  const resetKey = `${templates.length}:${templates[0]?.id ?? ''}`;
  const pagination = usePagination(templates, { pageSize: 8, resetKey });

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [pickerOpen,       setPickerOpen]       = useState(false);
  const [modalLevel,       setModalLevel]       = useState(null);

  // Union of all question types across the selected template's rounds.
  const allowedQuestionTypes = useMemo(() => {
    if (!selectedTemplate?.rounds?.length) return null;
    const set = new Set();
    for (const r of selectedTemplate.rounds) {
      for (const t of (r.questionTypes ?? [])) set.add(t);
    }
    return set.size > 0 ? [...set] : null;
  }, [selectedTemplate]);

  const gates = useCapabilityGates({
    lyricsCount:      selectedTemplate?.lyricsCount      ?? 0,
    instrumentsCount: selectedTemplate?.instrumentsCount ?? 0,
    selectedArtistsCount: selectedTemplate?.artistsIds?.length ?? 0,
    reasonLyrics: 'No lyrics available in this template.',
    allowedTypes: allowedQuestionTypes,
  });

  function seedSettingsFromRound(round) {
    if (!round) return;
    settings.applySettings({
      questionTypes:   round.questionTypes   ?? settings.questionTypes,
      answerMode:      round.answerMode      ?? 'choose',
      reversedAnswers: round.reversedAnswers ?? 'no',
      timer:           round.timer           ?? null,
      audioRendition:  round.reversedAudio ? 'reverse' : 'forward',
      instruments:     round.instruments     ?? 'none',
      roundCount:      round.rounds          ?? settings.roundCount,
    });
  }

  function handleOpenTemplate(template) {
    setSelectedTemplate(template);

    const levels = template.levels ?? [];

    if (levels.length > 1) {
      seedSettingsFromRound(template.rounds?.[0]);
      setPickerOpen(true);
      return;
    }

    const level = levels[0] ?? 2;
    const levelRound = template.rounds?.find(
      r => Number(r.level) === Number(level)
    ) ?? template.rounds?.[0];

    seedSettingsFromRound(levelRound);
    setModalLevel(level);
  }

  function handlePickLevel(level) {
    setPickerOpen(false);
    setModalLevel(level);

    const levelRound = selectedTemplate?.rounds?.find(
      r => Number(r.level) === Number(level)
    );
    seedSettingsFromRound(levelRound);
  }

  function handlePickerClose() {
    setPickerOpen(false);
    setSelectedTemplate(null);
  }

  function handleCloseModal() {
    setModalLevel(null);
    setSelectedTemplate(null);
  }

  function handlePlay() {
    if (!selectedTemplate || !modalLevel) return;

    const targetRound = selectedTemplate.rounds?.find(
      r => Number(r.level) === Number(modalLevel)
    );
    if (!targetRound) {
      alert('Template is missing a round definition for this level.');
      return;
    }

    const payload = {
      genres:      selectedTemplate.genresIds  ?? [],
      artists:     selectedTemplate.artistsIds ?? [],
      years:       parseYears(selectedTemplate.years),
      types:       gates.effectiveQuestionTypes,
      rendition:   settings.audioRendition === 'reverse' ? 'reverse' : 'forward',
      instruments: settings.instruments,
      answerMode:  settings.answerMode,
      timer:       settings.timer,
      reversed:    settings.reversedAnswers,
      count:       modalLevel === 3
                     ? Math.min(settings.roundCount, 10)
                     : settings.roundCount,
    };

    sessionStorage.setItem('game.lastPlayParams', JSON.stringify(payload));

    const path =
      modalLevel === 3 ? '/play-three' :
      modalLevel === 2 ? '/play-two'   :
                         '/play';

    navigate(path);
  }

  if (isLoading) {
    return (
      <BorderContainer border="all" className="p-8">
        <Loader variant="page" label="Loading templates…" />
      </BorderContainer>
    );
  }

  if (error) {
    return (
      <BorderContainer border="all" className="p-8 text-center">
        <OfflineBlock
        variant="page"
        title="Templates Unavailable"
        subtitle="Template data requires an internet connection. Please reconnect to browse ready-made games."
        onRetry={() => refetch?.()} // Ensure useTemplates exposes refetch
        showSetupLink={false}
        icon={<IconWifiOff className="w-8 h-8 text-wrong mb-2" />}
      />
      </BorderContainer>
    );
  }

  if (templates.length === 0) return <EmptyBlock />;

  return (
    <div className="max-w-3xl mx-auto pb-24 px-1 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">Templates</h1>
        <p className="text-sm text-ink-muted">
          {templates.length} template{templates.length === 1 ? '' : 's'}
        </p>
      </div>

      <ul className="space-y-3">
        {pagination.items.map(t => (
          <li key={t.id}>
            <TemplateRow template={t} onPlay={handleOpenTemplate} />
          </li>
        ))}
      </ul>

      <Pagination pagination={pagination} />

      {pickerOpen && selectedTemplate && (
        <LevelPickerModal
          open
          onClose={handlePickerClose}
          levels={selectedTemplate.levels}
          onSelect={handlePickLevel}
        />
      )}

      {selectedTemplate && !pickerOpen && modalLevel === 1 && (
        <Level1Modal
          open
          onClose={handleCloseModal}
          onPlay={handlePlay}
          disabledTypes={gates.disabledTypes}
          disabledReasons={gates.disabledReasons}
          reversedClipsCount={selectedTemplate.reversedClipsCount ?? 0}
          allowInstruments={gates.allowInstruments}
          onQuestionTypeUnfavorited={() => {}}
        />
      )}

      {selectedTemplate && !pickerOpen && modalLevel === 2 && (
        <Level2Modal
          open
          onClose={handleCloseModal}
          onPlay={handlePlay}
          disabledTypes={gates.disabledTypes}
          disabledReasons={gates.disabledReasons}
          reversedClipsCount={selectedTemplate.reversedClipsCount ?? 0}
          allowInstruments={gates.allowInstruments}
          onQuestionTypeUnfavorited={() => {}}
        />
      )}

      {selectedTemplate && !pickerOpen && modalLevel === 3 && (
        <Level3Modal
          open
          onClose={handleCloseModal}
          onPlay={handlePlay}
          disabledTypes={gates.disabledTypes}
          disabledReasons={gates.disabledReasons}
          reversedClipsCount={selectedTemplate.reversedClipsCount ?? 0}
          allowInstruments={false}
          genreMode={(selectedTemplate.genresIds?.length ?? 0) > 0 ? 'some' : 'all'}
          effectiveSelectedArtistsCount={selectedTemplate.artistsIds?.length ?? 0}
          onQuestionTypeUnfavorited={() => {}}
        />
      )}
    </div>
  );
}