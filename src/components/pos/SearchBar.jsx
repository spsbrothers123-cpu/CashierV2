import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export function SearchBar({ value, onChange, placeholder = 'Search products, SKU, or barcode…', className, onScanClick }) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="pointer-events-none absolute left-3.5 size-4 text-charcoal-300" aria-hidden />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search products"
        className="h-11 w-full rounded-[10px] border border-charcoal-900/12 bg-surface-white pl-10 pr-20 text-sm text-charcoal-900 placeholder:text-charcoal-300 outline-none transition-colors focus:border-egg-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-11 rounded-full p-1 text-charcoal-300 hover:bg-charcoal-900/5 hover:text-charcoal-600"
        >
          <X className="size-3.5" />
        </button>
      )}
      {onScanClick && (
        <button
          onClick={onScanClick}
          aria-label="Scan barcode"
          className="absolute right-1.5 flex size-8 items-center justify-center rounded-[8px] bg-charcoal-900/6 text-charcoal-700 hover:bg-charcoal-900/10"
        >
          <ScanIcon />
        </button>
      )}
    </div>
  );
}

function ScanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" />
      <path d="M7 12h10" strokeLinecap="round" />
    </svg>
  );
}
