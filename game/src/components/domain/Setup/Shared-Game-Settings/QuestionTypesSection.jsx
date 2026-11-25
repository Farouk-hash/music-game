import { QuestionTypePicker } from '../QuestionTypePicker/QuestionTypePicker.jsx';

export function QuestionTypesSection({ value, onChange, disabledTypes, disabledReasons, onUnfavorited, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Question types</h3>
      <QuestionTypePicker
        onUnfavorited={onUnfavorited}
        value={value}
        onChange={onChange}
        disabledTypes={disabledTypes}
        disabledReasons={disabledReasons}
        disabled={readOnly}
      />
    </section>
  );
}