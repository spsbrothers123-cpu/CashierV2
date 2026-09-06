import { cn } from '@/utils/cn';

export function CategoryFilter({ categories, active, onChange }) {
  const all = ['All', ...categories];
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product categories">
      {all.map((cat) => {
        const isActive = active === cat || (active === '' && cat === 'All');
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(cat === 'All' ? '' : cat)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-charcoal-900 text-ivory-50'
                : 'bg-surface-white text-charcoal-600 border border-charcoal-900/10 hover:bg-charcoal-900/5'
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
