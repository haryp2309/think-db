import React, { useState, useRef, useEffect } from 'react';
import { TableSchema, RowItem } from '../../types';
import { fetchRows } from '../../services/api';
import { Edit3, Check, X, Sparkles } from 'lucide-react';

interface BatchPropertyEditMenuProps {
  schema: TableSchema;
  selectedCount: number;
  onApply: (propertyName: string, newValue: any) => void;
}

export const BatchPropertyEditMenu: React.FC<BatchPropertyEditMenuProps> = ({
  schema,
  selectedCount,
  onApply,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedProp, setSelectedProp] = useState<string>('title');
  const [textValue, setTextValue] = useState('');
  const [enumValue, setEnumValue] = useState('');
  const [tagsValue, setTagsValue] = useState<string[]>([]);
  const [refValue, setRefValue] = useState<number | null>(null);
  const [targetRows, setTargetRows] = useState<RowItem[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const selectedCol = schema.columns.find((c) => c.name === selectedProp);
  const titleLabel = schema.title_alias || 'Title';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When selected property changes, reset input values & fetch reference rows if needed
  useEffect(() => {
    setTextValue('');
    setEnumValue('');
    setTagsValue([]);
    setRefValue(null);

    if (selectedCol && selectedCol.type === 'reference' && selectedCol.target_table_id) {
      setLoadingRows(true);
      fetchRows(selectedCol.target_table_id)
        .then((res) => setTargetRows(res.rows || []))
        .catch(() => setTargetRows([]))
        .finally(() => setLoadingRows(false));
    }
  }, [selectedProp, selectedCol]);

  const handleApply = () => {
    if (selectedProp === 'title') {
      onApply('title', textValue);
    } else if (selectedCol) {
      if (selectedCol.type === 'string') {
        onApply(selectedCol.name, textValue);
      } else if (selectedCol.type === 'enum') {
        onApply(selectedCol.name, enumValue);
      } else if (selectedCol.type === 'tags') {
        onApply(selectedCol.name, tagsValue);
      } else if (selectedCol.type === 'reference') {
        onApply(selectedCol.name, refValue);
      }
    }
    setOpen(false);
  };

  const toggleTag = (tag: string) => {
    if (tagsValue.includes(tag)) {
      setTagsValue(tagsValue.filter((t) => t !== tag));
    } else {
      setTagsValue([...tagsValue, tag]);
    }
  };

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
      >
        <Edit3 className="w-3.5 h-3.5" />
        <span>Edit Property ({selectedCount})</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Batch Edit {selectedCount} Selected {selectedCount === 1 ? 'Row' : 'Rows'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Property Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Select Property to Change
            </label>
            <select
              value={selectedProp}
              onChange={(e) => setSelectedProp(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="title">{titleLabel} (Title)</option>
              {schema.columns.map((col) => (
                <option key={col.id} value={col.name}>
                  {col.name} ({col.type})
                </option>
              ))}
            </select>
          </div>

          {/* Value Editor based on Property Type */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              New Value to Apply
            </label>

            {(selectedProp === 'title' || (selectedCol && selectedCol.type === 'string')) && (
              <input
                type="text"
                placeholder="Enter text value..."
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                autoFocus
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
            )}

            {selectedCol && selectedCol.type === 'enum' && (
              <select
                value={enumValue}
                onChange={(e) => setEnumValue(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Clear / Unassign --</option>
                {selectedCol.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {selectedCol && selectedCol.type === 'tags' && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {selectedCol.options.map((opt) => {
                    const active = tagsValue.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleTag(opt)}
                        className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${
                          active
                            ? 'bg-purple-600 text-white border-purple-500 font-medium'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-purple-400'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedCol.options.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic">No configured tags</p>
                )}
              </div>
            )}

            {selectedCol && selectedCol.type === 'reference' && (
              <div>
                {loadingRows ? (
                  <p className="text-xs text-slate-400 italic">Loading target rows...</p>
                ) : (
                  <select
                    value={refValue || ''}
                    onChange={(e) => setRefValue(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Remove Reference --</option>
                    {targetRows.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.emoji ? `${r.emoji} ` : ''}{r.title || `Row #${r.id}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md transition-colors"
            >
              Apply to {selectedCount} Rows
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
