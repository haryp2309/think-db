import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Columns, X, Type, List, Tag, Link2, Star, Sparkles, Calculator } from 'lucide-react';
import { PropertyType, TableSummary, RowItem, TableSchema } from '../../types';
import { fetchRows, fetchTableSchema } from '../../services/api';

interface AddPropertyModalProps {
  currentTableId: number;
  currentTableSchema?: TableSchema | null;
  tables: TableSummary[];
  onClose: () => void;
  onSubmit: (colData: {
    name: string;
    type: PropertyType;
    options?: Array<{ value: string; isDefault: boolean }>;
    target_table_id?: number | null;
    relation_column_name?: string | null;
    target_property_name?: string | null;
  }) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  currentTableId,
  currentTableSchema,
  tables,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('string');
  const [optionInput, setOptionInput] = useState('');
  const [options, setOptions] = useState<Array<{ value: string; isDefault: boolean }>>([]);
  const [targetTableId, setTargetTableId] = useState<number | null>(null);
  const [targetTableRows, setTargetTableRows] = useState<RowItem[]>([]);
  const [defaultRelationRowId, setDefaultRelationRowId] = useState<number | null>(null);

  // Rollup state
  const [selectedRelationCol, setSelectedRelationCol] = useState<string>('');
  const [selectedTargetProp, setSelectedTargetProp] = useState<string>('');
  const [targetTableSchema, setTargetTableSchema] = useState<TableSchema | null>(null);

  const availableTargetTables = tables.filter((t) => t.id !== currentTableId);
  const relationColumns = (currentTableSchema?.columns || []).filter(
    (c) => c.type === 'reference' || c.type === 'referenced' || c.is_inverse
  );

  useEffect(() => {
    if (type === 'reference' && targetTableId) {
      fetchRows(targetTableId)
        .then((res) => setTargetTableRows(res.rows || []))
        .catch(() => setTargetTableRows([]));
    } else {
      setTargetTableRows([]);
      setDefaultRelationRowId(null);
    }
  }, [type, targetTableId]);

  useEffect(() => {
    if (type === 'rollup') {
      if (relationColumns.length > 0 && !selectedRelationCol) {
        setSelectedRelationCol(relationColumns[0].name);
      }
    }
  }, [type, relationColumns, selectedRelationCol]);

  useEffect(() => {
    if (type === 'rollup' && selectedRelationCol) {
      const relCol = relationColumns.find((c) => c.name === selectedRelationCol);
      if (relCol?.target_table_id) {
        fetchTableSchema(relCol.target_table_id)
          .then((schema) => {
            setTargetTableSchema(schema);
            if (schema.columns.length > 0 && (!selectedTargetProp || !schema.columns.some((c) => c.name === selectedTargetProp))) {
              setSelectedTargetProp(schema.columns[0].name);
            }
          })
          .catch(() => setTargetTableSchema(null));
      } else {
        setTargetTableSchema(null);
      }
    } else {
      setTargetTableSchema(null);
    }
  }, [type, selectedRelationCol, relationColumns]);

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
    if (type === 'reference' && !targetTableId) return;
    if (type === 'rollup' && (!selectedRelationCol || !selectedTargetProp)) return;

    const finalOptions =
      type === 'enum' || type === 'tags'
        ? options
        : type === 'reference' && defaultRelationRowId
        ? [{ value: String(defaultRelationRowId), isDefault: true }]
        : [];

    const activeRelCol = relationColumns.find((c) => c.name === selectedRelationCol);
    const rollTargetTableId = activeRelCol?.target_table_id || null;

    onSubmit({
      name: name.trim(),
      type,
      options: finalOptions,
      target_table_id: type === 'reference' ? targetTableId : type === 'rollup' ? rollTargetTableId : null,
      relation_column_name: type === 'rollup' ? selectedRelationCol : null,
      target_property_name: type === 'rollup' ? selectedTargetProp : null,
    });
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onMouseDown={handleBackdrop}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700/80 shadow-2xl dark:bg-slate-900 bg-white animate-in zoom-in-90 fade-in duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b dark:border-slate-800 border-slate-200">
          <div className="flex items-center gap-2">
            <Columns className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold dark:text-slate-100 text-slate-900">Add Custom Property</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="dark:text-slate-400 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Property Name */}
          <div>
            <label className="block text-xs font-medium dark:text-slate-300 text-slate-600 mb-1.5">
              Property Name
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

          {/* Property Type Selector */}
          <div>
            <label className="block text-xs font-medium dark:text-slate-300 text-slate-600 mb-1.5">
              Property Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'string', label: 'String Text', icon: Type, desc: 'Free-form text' },
                { id: 'enum', label: 'Enum Select', icon: List, desc: 'Single select option' },
                { id: 'tags', label: 'Tags Multi-Select', icon: Tag, desc: 'Multiple tag pills' },
                { id: 'reference', label: 'Relation (Many-to-One)', icon: Link2, desc: 'Link each row to 1 target row' },
                { id: 'rollup', label: 'Rollup', icon: Calculator, desc: 'Pull property from relation' },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as PropertyType)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all text-left ${
                      isSelected
                        ? 'bg-blue-900/30 border-blue-500/80 text-blue-300'
                        : 'dark:bg-slate-900/60 bg-slate-50 dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500 dark:hover:bg-slate-800/50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold">{t.label}</span>
                    </div>
                    <p className="text-[10px] dark:text-slate-500 text-slate-400">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options Builder for Enum or Tags */}
          {(type === 'enum' || type === 'tags') && (
            <div className="p-3 dark:bg-slate-950/80 bg-slate-50 dark:border-slate-800 border-slate-200 border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium dark:text-slate-300 text-slate-600">
                  Configure Options
                </label>
                {options.some((o) => o.isDefault) && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
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
                        ? 'bg-amber-900/30 border-amber-500/60 text-amber-300'
                        : 'dark:bg-slate-800 bg-slate-100 dark:border-slate-700 border-slate-300 dark:text-slate-200 text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      title={opt.isDefault ? 'Remove default' : 'Set as default'}
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
                    No options yet — type and press Enter or Add
                  </span>
                )}
              </div>

              <p className="text-[10px] dark:text-slate-500 text-slate-400 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                Click the star on an option to make it the default for new rows
              </p>
            </div>
          )}

          {/* Target Table Selector for Reference */}
          {type === 'reference' && (
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

              <div className="flex items-start gap-1.5 text-[11px] text-blue-400/90 pt-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Adding a relation column creates a Many-to-One relationship. Each row links to a single target row, creating an aggregated read-only column on the target table.
                </span>
              </div>
            </div>
          )}

          {/* Target Relation & Property Selector for Rollup */}
          {type === 'rollup' && (
            <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-xl space-y-3">
              {relationColumns.length === 0 ? (
                <div className="text-xs text-amber-400/90 py-1">
                  ⚠️ No Relation properties found on this table. Please add a <strong>Relation (Many-to-One)</strong> property first before adding a Rollup.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">
                      Select Relation Property
                    </label>
                    <select
                      value={selectedRelationCol}
                      onChange={(e) => setSelectedRelationCol(e.target.value)}
                      className="w-full dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 border rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-purple-500"
                    >
                      {relationColumns.map((col) => (
                        <option key={col.id} value={col.name}>
                          🔗 {col.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetTableSchema && (
                    <div>
                      <label className="block text-xs font-medium text-purple-300 mb-1">
                        Target Property (from {targetTableSchema.emoji} {targetTableSchema.name})
                      </label>
                      <select
                        value={selectedTargetProp}
                        onChange={(e) => setSelectedTargetProp(e.target.value)}
                        className="w-full dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 border rounded-lg px-3 py-2 text-xs dark:text-slate-100 text-slate-900 focus:outline-none focus:border-purple-500"
                      >
                        <option value="title">📄 Title ({targetTableSchema.title_alias || 'Title'})</option>
                        {targetTableSchema.columns.map((col) => (
                          <option key={col.id} value={col.name}>
                            {col.name} ({col.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-start gap-1.5 text-[11px] text-purple-400/90 pt-1">
                    <Calculator className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-400" />
                    <span>
                      Rollup dynamically looks up and displays the selected property from linked target row(s).
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-slate-800 border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border dark:border-slate-700 border-slate-300 text-xs dark:text-slate-300 text-slate-600 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !name.trim() ||
                (type === 'reference' && !targetTableId) ||
                (type === 'rollup' && (!selectedRelationCol || !selectedTargetProp))
              }
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors shadow-lg shadow-blue-600/25"
            >
              Add Property
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
