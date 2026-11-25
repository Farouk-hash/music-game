import { ReversedAudioPicker } from '../ReversedAudioPicker/ReversedAudioPicker.jsx';

export function ReversedAudioSection({ value, onChange, reversedClipsCount, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Reversed audio</h3>
      <p className="text-xs text-ink-muted">
        Play the clip backwards instead of forwards.
        {reversedClipsCount === 0 && <span> No reversed renditions available yet.</span>}
      </p>
      <ReversedAudioPicker
        value={value}
        onChange={onChange}
        disabled={readOnly}
        reversedClipsCount={reversedClipsCount}
      />
    </section>
  );
}