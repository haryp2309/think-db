import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Settings2, X, Star, Sparkles, Trash2, Tag, List, Type, Link2 } from 'lucide-react';
import { ColumnMeta, TableSummary, RowItem } from '../../types';
import { fetchRows } from '../../services/api';

interface EditPropertyModalProps {
  column: ColumnMeta;
  currentTableId: number;
  tables: TableSummary[];
  onClose: () => void;
  onSubmit: (colData: {
    name: string;
    options?: Array<{ value: string; isDefault: boolean }>;
    target_table_id?: number | null;
  }) => void;
  onDelete: () => void;
}

export const EditPropertyModal: React.FC<EditPropertyModalProps> = ({
  column,
  currentTableId,
  tables,
  onClose,
  onSubmit,
  onDelete,
}) => {
  const [name, setName] = useState(column.name || '');
  const [optionInput, setOptionInput] = useState('');

  // Initialize options with defaults if available
  const initialOptions: Array<{ value: string; isDefault: boolean }> =
    column.options_with_defaults && column.options_with_defaults.length > 0
      ? column.options_with_defaults
      : (column.options || []).map((opt) => ({
          value: opt,
          isDefault: column.default_value === opt,
        }));

  const [options, setOptions] = useState<Array<{ value: string; isDefault: boolean }>>(initialOptions);
  const [targetTableId, setTargetTableId] = useState<number | null>(column.target_table_id || null);

  const initialDefaultRefId = column.default_value && strIsDigit(column.default_value) ? Number(column.default_value) : null;
  const [targetTableRows, setTargetTableRows] = useState<RowItem[]>([]);
  const [defaultRelationRowId, setDefaultRelationRowId] = useState<number | null>(initialDefaultRefId);

  const availableTargetTables = tables.filter((t) => t.id !== currentTableId);

  function strIsDigit(val: any): boolean {
    return val !== null && val !== undefined && !isNaN(Number(val));
  }

  useEffect(() => {
    if (column.type === 'reference' && targetTableId) {
      fetchRows(targetTableId)
        .then((res) => setTargetTableRows(res.rows || []))
        .catch(() => setTargetTableRows([]));
    }
  }, [column.type, targetTableId]);

  const handleAddOption = () => {
    const v = optionInput.trim();
    if (!v) return;
    if (options.some((o) => o.value === v)) return;
    setOptions([...options, { value: v, isDefault: false }]);
    setOptionInput('');
  };

  const handleRemoveOption = (val: string) => {
    setOptions(options.filter((o) => o.value !== val));
  };

  const handleToggleDefault = (val: string) => {
    setOptions(
      options.map((o) => ({
        ...o,
        isDefault: o.value === val ? !o.isDefault : false, // only one default
      }))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalOptions =
      column.type === 'enum' || column.type === 'tags'
        ? options
        : column.type === 'reference' && defaultRelationRowId
        ? [{ value: String(defaultRelationRowId), isDefault: true }]
        : [];

    onSubmit({
      name: name.trim(),
      options: finalOptions,
      target_table_id: column.type === 'reference' ? targetTableId : null,
    });
  };


  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const TypeIcon =
    column.type === 'enum'
      ? List
      : column.type === 'tags'
      ? Tag
      : column.type === 'reference'
      ? Link2
      : Type;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={handleBackdrop}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700/80 shadow-2xl dark:bg-slate-900 bg-white animate-in zoom-in-90 fade-in duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b dark:border-slate-800 border-slate-200">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-semibold">Edit Property Schema</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Property Type Display (Read-Only) */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs">
            <TypeIcon className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold uppercase text-[10px] text-slate-500 dark:text-slate-400 block">Property Type</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{column.type}</span>
            </div>
          </div>

          {/* Property Name */}
          <div>
            <label className="block text-xs font-medium dark:text-slate-300 text-slate-600 mb-1.5">
              Property Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Priority, Assigned To, Status"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full dark:bg-slate-950 bg-slate-50 dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2.5 text-sm dark:text-slate-100 text-slate-900 focus:outline-none focus:border-blue-500 border"
            />
          </div>

          {/* Options Builder for Enum or Tags */}
          {(column.type === 'enum' || column.type === 'tags') && (
            <div className="p-3 dark:bg-slate-950/80 bg-slate-50 dark:border-slate-800 border-slate-200 border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium dark:text-slate-300 text-slate-600">
                  Configure Options & Default Value
                </label>
                {options.some((o) => o.isDefault) && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    Default set
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter option..."
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  className="flex-1 dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 border rounded-lg px-2.5 py-1.5 text-xs dark:text-slate-200 text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="dark:bg-slate-800 bg-slate-200 dark:hover:bg-slate-700 hover:bg-slate-300 dark:text-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {options.map((opt) => (
                  <div
                    key={opt.value}
                    className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition-all ${
                      opt.isDefault
                        ? 'bg-amber-900/30 border-amber-500/60 text-amber-300 font-semibold'
                        : 'dark:bg-slate-800 bg-slate-100 dark:border-slate-700 border-slate-300 dark:text-slate-200 text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      title={opt.isDefault ? 'Remove default' : 'Set as default option for new rows'}
                      onClick={() => handleToggleDefault(opt.value)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-3 h-3 ${opt.isDefault ? 'fill-amber-400 text-amber-400' : 'dark:text-slate-600 text-slate-400 hover:text-amber-400'}`}
                      />
                    </button>
                    <span>{opt.value}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(opt.value)}
                      className="dark:text-slate-400 text-slate-400 dark:hover:text-red-400 hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {options.length === 0 && (
                  <span className="text-[11px] dark:text-slate-500 text-slate-400 italic pt-0.5">
                    No options configured — type and press Add
                  </span>
                )}
              </div>

              <p className="text-[10px] dark:text-slate-500 text-slate-400 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 shrink-0" />
                Click the star icon to select the default value for new rows
              </p>
            </div>
          )}

          {/* Target Table Selector for Reference */}
          {column.type === 'reference' && (
            <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl space-y-3">
              <div>
                <label className="block text-xs font-medium text-blue-300 mb-1">
                  Target Dynamic Table
                </label>
                <select
                  value={targetTableId || ''}
                  onChange={(e) => setTargetTableId(Number(e.target.value) || null)}
                  className="w-full dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 border rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select target table...</option>
                  {availableTargetTables.map((tbl) => (
                    <option key={tbl.id} value={tbl.id}>
                      {tbl.emoji} {tbl.name}
                    </option>
                  ))}
                </select>
              </div>

              {targetTableId && (
                <div>
                  <label className="block text-xs font-medium text-blue-300 mb-1 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Default Relation Row (Optional)
                  </label>
                  <select
                    value={defaultRelationRowId || ''}
                    onChange={(e) => setDefaultRelationRowId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 border rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No default relation (None)</option>
                    {targetTableRows.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.emoji ? `${r.emoji} ` : ''}{r.title || `Row #${r.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}


          {/* Actions & Delete Property */}
          <div className="flex items-center justify-between pt-3 border-t dark:border-slate-800 border-slate-200">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to delete the property "${column.name}"? This action cannot be undone.`)) {
                  onDelete();
                  onClose();
                }
              }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium hover:underline px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Property</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border dark:border-slate-700 border-slate-300 text-xs dark:text-slate-300 text-slate-600 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors shadow-lg shadow-blue-600/25"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
