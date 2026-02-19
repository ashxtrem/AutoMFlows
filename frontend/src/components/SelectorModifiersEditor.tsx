import { useState } from 'react';
import type { SelectorModifiers } from '@automflows/shared';
import { SELECTOR_TYPE_OPTIONS } from '../utils/selectorHelpers';

interface SelectorModifiersEditorProps {
  value?: SelectorModifiers;
  onChange: (value: SelectorModifiers | undefined) => void;
  /** Compact mode for inline property renderers */
  compact?: boolean;
}

function hasAnyModifier(mods?: SelectorModifiers): boolean {
  if (!mods) return false;
  return (
    mods.nth !== undefined ||
    !!mods.filterText ||
    !!mods.filterSelector ||
    !!mods.chainSelector ||
    mods.pierceShadow === true ||
    mods.pierceShadow === false
  );
}

export default function SelectorModifiersEditor({
  value,
  onChange,
  compact = false,
}: SelectorModifiersEditorProps) {
  const [expanded, setExpanded] = useState(hasAnyModifier(value));
  const mods = value || {};

  const update = (updates: Partial<SelectorModifiers>) => {
    const next = { ...mods, ...updates };
    // Remove undefined keys
    Object.keys(next).forEach((k) => {
      const key = k as keyof SelectorModifiers;
      if ((next as any)[key] === undefined || (next as any)[key] === '') {
        delete (next as any)[key];
      }
    });
    const hasAny = hasAnyModifier(next);
    onChange(hasAny ? next : undefined);
  };

  const inputClass = compact
    ? 'px-2 py-1 text-xs bg-surfaceHighlight border border-border rounded'
    : 'w-full px-3 py-2 bg-surfaceHighlight border border-border rounded text-sm';
  const labelClass = compact ? 'text-xs font-medium text-primary mb-0.5' : 'block text-sm font-medium text-primary mb-1';

  const content = (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Element index (nth)</label>
        <input
          type="number"
          value={mods.nth ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            update({ nth: v === '' ? undefined : parseInt(v, 10) });
          }}
          placeholder="0 = first, -1 = last"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Filter by text</label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={mods.filterText ?? ''}
            onChange={(e) => update({ filterText: e.target.value || undefined })}
            placeholder="Text to filter by"
            className={inputClass}
          />
          <label className="flex items-center gap-1 text-xs text-secondary whitespace-nowrap">
            <input
              type="checkbox"
              checked={mods.filterTextRegex ?? false}
              onChange={(e) => update({ filterTextRegex: e.target.checked || undefined })}
            />
            Regex
          </label>
        </div>
      </div>
      <div>
        <label className={labelClass}>Filter by child selector</label>
        <div className="space-y-1">
          <select
            value={mods.filterSelectorType ?? 'css'}
            onChange={(e) => update({ filterSelectorType: e.target.value as any })}
            className={inputClass}
          >
            {SELECTOR_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={mods.filterSelector ?? ''}
            onChange={(e) => update({ filterSelector: e.target.value || undefined })}
            placeholder="Child selector"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Chain selector (scoped)</label>
        <div className="space-y-1">
          <select
            value={mods.chainSelectorType ?? 'css'}
            onChange={(e) => update({ chainSelectorType: e.target.value as any })}
            className={inputClass}
          >
            {SELECTOR_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={mods.chainSelector ?? ''}
            onChange={(e) => update({ chainSelector: e.target.value || undefined })}
            placeholder="Scoped sub-query"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={mods.pierceShadow ?? false}
            onChange={(e) => update({ pierceShadow: e.target.checked ? true : undefined })}
          />
          <span className={labelClass}>Pierce shadow DOM</span>
        </label>
        <div className="text-xs text-secondary mt-0.5">
          CSS pierces shadow by default. Uncheck to restrict to light DOM.
        </div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="border border-border rounded p-2 bg-surfaceHighlight/30">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-primary w-full text-left flex items-center justify-between"
        >
          Selector Modifiers
          <span className="text-secondary">{expanded ? '−' : '+'}</span>
        </button>
        {expanded && <div className="mt-2">{content}</div>}
      </div>
    );
  }

  return (
    <div className="border border-border rounded p-3 bg-surfaceHighlight/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-sm font-medium text-primary w-full text-left flex items-center justify-between mb-2"
      >
        Selector Modifiers (nth, filter, chain)
        <span className="text-secondary">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && content}
    </div>
  );
}
