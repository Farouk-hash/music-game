// admin/src/routes/TemplateEditor.jsx
import { useParams } from 'react-router-dom';
import { useTemplate } from '../../hooks/cloud-flare/Templates/useTemplates';
import { LoadingBlock } from '../../components/ui/Spinner';
import { TemplateEditorForm } from '../../components/domain/Templates/TemplateEditorForm';

export default function TemplateEditor() {
  const { id } = useParams();
  const isNew = id === 'new' || !id;

  const { template, loading } = useTemplate(isNew ? null : Number(id));

  if (!isNew && loading && !template) {
    return <LoadingBlock label="Loading template…" />;
  }

  return (
    <TemplateEditorForm
      key={isNew ? 'new' : template?.id ?? 'loading'}
      initial={isNew ? null : template}
    />
  );
}