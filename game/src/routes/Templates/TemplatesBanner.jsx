import { Link } from 'react-router-dom';
import { IconChevronRight, IconCollection, IconPlay } from '@/icons';
import { useTemplates } from '@/hooks/templates/useTemplates';

export function TemplatesBanner() {
    const { templates, isLoading: templatesLoading } = useTemplates();

    if (templatesLoading) return null;
    const count = templates.length ;
    return (
        <Link
        to="/templates"
        className="block rounded-md border border-highlight bg-surface-2 p-4 hover:bg-accent transition-colors"
        >
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-highlight font-semibold flex items-center gap-1.5">
                <IconCollection className="w-4 h-4" />
                Templates
            </p>
            <p className="text-lg font-bold text-ink flex items-center gap-1.5 mt-0.5">
                Play a Template
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
                {count > 0
                ? `${count} ready-made game${count === 1 ? '' : 's'} to jump into`
                : 'More coming soon'}
            </p>
            </div>
            
            <IconChevronRight className="w-6 h-6" />
            
        </div>
        </Link>
    );
}