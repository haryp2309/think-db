import React, { useState, useRef, useEffect } from 'react';
import { TableSchema, FilterRule, SortRule } from '../../types';
import { Filter, ArrowUpDown, Layers, Plus, X, LayoutGrid, ArrowUp, ArrowDown, CheckSquare, Square } from 'lucide-react';
import { BatchPropertyEditMenu } from './BatchPropertyEditMenu';

interface FilterSortToolbarProps {
  schema: TableSchema;
  filterConfig: FilterRule[];
  sortConfig: SortRule[];
  groupByColumnId: number | null;
  cardProperties: string[];
  viewType?: 'grid' | 'kanban';
  selectedRowIds?: number[];
  onUpdateFilters: (filters: FilterRule[]) => void;
  onUpdateSorts: (sorts: SortRule[]) => void;
  onUpdateGroupBy: (columnId: number | null) => void;
  onUpdateCardProperties: (props: string[]) => void;
  onBatchUpdateProperty?: (propertyName: string, newValue: any) => void;
}

export const FilterSortToolbar: React.FC<FilterSortToolbarProps> = ({
  schema,
  filterConfig,
  sortConfig,
  groupByColumnId,
  cardProperties,
  viewType = 'grid',
  selectedRowIds = [],
  onUpdateFilters,
  onUpdateSorts,
  onUpdateGroupBy,
  onUpdateCardProperties,
  onBatchUpdateProperty,
}) => {

  const [openFilterMenu, setOpenFilterMenu] = useState(false);
  const [openSortMenu, setOpenSortMenu] = useState(false);
  const [openCardPropMenu, setOpenCardPropMenu] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const cardPropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilterMenu(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setOpenSortMenu(false);
      }
      if (cardPropRef.current && !cardPropRef.current.contains(e.target as Node)) {
        setOpenCardPropMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allProperties = ['title', ...schema.columns.map((c) => c.name)];
  const groupableColumns = schema.columns.filter((c) => c.type === 'enum' || c.type === 'tags');
  const availableColumns = ['content', ...schema.columns.map((c) => c.name)];

  // Auto-assign first available group column in Kanban view if unassigned
  useEffect(() => {
    if (viewType === 'kanban' && !groupByColumnId && groupableColumns.length > 0) {
      onUpdateGroupBy(groupableColumns[0].id);
    }
  }, [viewType, groupByColumnId, groupableColumns, onUpdateGroupBy]);

  // Filter handlers
  const handleAddFilter = () => {
    const defaultProp = schema.columns.length > 0 ? schema.columns[0].name : 'title';
    onUpdateFilters([
      ...filterConfig,
      { property: defaultProp, operator: 'equals', value: '' },
    ]);
  };

  const handleRemoveFilter = (index: number) => {
    onUpdateFilters(filterConfig.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index: number, key: keyof FilterRule, val: any) => {
    const next = [...filterConfig];
    next[index] = { ...next[index], [key]: val };
    onUpdateFilters(next);
  };

  // Sort handlers
  const handleAddSort = () => {
    const defaultProp = schema.columns.length > 0 ? schema.columns[0].name : 'title';
    onUpdateSorts([
      ...sortConfig,
      { property: defaultProp, direction: 'asc' },
    ]);
  };

  const handleRemoveSort = (index: number) => {
    onUpdateSorts(sortConfig.filter((_, i) => i !== index));
  };

  const handleSortChange = (index: number, key: keyof SortRule, val: any) => {
    const next = [...sortConfig];
    next[index] = { ...next[index], [key]: val };
    onUpdateSorts(next);
  };

  // Card properties reordering & toggle handlers
  const toggleCardProperty = (colName: string) => {
    if (cardProperties.includes(colName)) {
      onUpdateCardProperties(cardProperties.filter((p) => p !== colName));
    } else {
      onUpdateCardProperties([...cardProperties, colName]);
    }
  };

  const moveCardProperty = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= cardProperties.length) return;
    const next = [...cardProperties];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onUpdateCardProperties(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800/80 text-xs transition-colors shrink-0">
      {/* Batch Property Edit Trigger (Visible when rows selected) */}
      {selectedRowIds.length > 0 && onBatchUpdateProperty && (
        <BatchPropertyEditMenu
          schema={schema}
          selectedCount={selectedRowIds.length}
          onApply={onBatchUpdateProperty}
        />
      )}

      {/* Filter Menu Trigger */}
      <div ref={filterRef} className="relative">

        <button
          onClick={() => setOpenFilterMenu(!openFilterMenu)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border font-medium transition-all active:scale-95 ${
            filterConfig.length > 0
              ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 border-blue-300 dark:border-blue-500/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
          {filterConfig.length > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
              {filterConfig.length}
            </span>
          )}
        </button>

        {openFilterMenu && (
          <div className="absolute left-0 top-full mt-1 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Filter Conditions</span>
              <button
                type="button"
                onClick={handleAddFilter}
                className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>Add Filter</span>
              </button>
            </div>

            {filterConfig.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic py-2">No filters applied</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filterConfig.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <select
                      value={rule.property}
                      onChange={(e) => handleFilterChange(idx, 'property', e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {allProperties.map((p) => (
                        <option key={p} value={p}>
                          {p === 'title' ? (schema.title_alias || 'Title') : p}
                        </option>
                      ))}
                    </select>

                    <select
                      value={rule.operator}
                      onChange={(e) => handleFilterChange(idx, 'operator', e.target.value as any)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="equals">equals</option>
                      <option value="contains">contains</option>
                      <option value="not_equals">not equals</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Value..."
                      value={rule.value || ''}
                      onChange={(e) => handleFilterChange(idx, 'value', e.target.value)}
                      className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveFilter(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sort Menu Trigger */}
      <div ref={sortRef} className="relative">
        <button
          onClick={() => setOpenSortMenu(!openSortMenu)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border font-medium transition-all active:scale-95 ${
            sortConfig.length > 0
              ? 'bg-purple-50 dark:bg-purple-600/20 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-500/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Sort</span>
          {sortConfig.length > 0 && (
            <span className="bg-purple-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
              {sortConfig.length}
            </span>
          )}
        </button>

        {openSortMenu && (
          <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Sorting Rules</span>
              <button
                type="button"
                onClick={handleAddSort}
                className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>Add Sort</span>
              </button>
            </div>

            {sortConfig.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic py-2">No sorting rules applied</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {sortConfig.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <select
                      value={rule.property}
                      onChange={(e) => handleSortChange(idx, 'property', e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none flex-1"
                    >
                      {allProperties.map((p) => (
                        <option key={p} value={p}>
                          {p === 'title' ? (schema.title_alias || 'Title') : p}
                        </option>
                      ))}
                    </select>

                    <select
                      value={rule.direction}
                      onChange={(e) => handleSortChange(idx, 'direction', e.target.value as any)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="asc">Ascending (A-Z)</option>
                      <option value="desc">Descending (Z-A)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveSort(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Properties Configurator (Available across all views) */}
      <div ref={cardPropRef} className="relative">
        <button
          onClick={() => setOpenCardPropMenu(!openCardPropMenu)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border font-medium transition-all active:scale-95 ${
            availableColumns.length > 0 && cardProperties.length < availableColumns.length
              ? 'bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LayoutGrid
            className={`w-3.5 h-3.5 ${
              availableColumns.length > 0 && cardProperties.length < availableColumns.length
                ? 'text-emerald-500 dark:text-emerald-400'
                : ''
            }`}
          />
          <span>Properties</span>
          {availableColumns.length > 0 && cardProperties.length < availableColumns.length && (
            <span className="bg-emerald-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
              {cardProperties.length}
            </span>
          )}
        </button>

        {openCardPropMenu && (
          <div className="absolute left-0 top-full mt-1 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">View Properties</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                {cardProperties.length} Visible
              </span>
            </div>

            {/* Active Visible Properties (Ordered 0..N-1) */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Visible Properties & Order
              </div>
              {cardProperties.length === 0 ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic py-1">
                  No custom properties selected
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {cardProperties.map((colName, orderIdx) => (
                    <div
                      key={colName}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-emerald-300/60 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCardProperty(colName)}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                        title="Click to hide property"
                      >
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {colName === 'content' ? 'Content' : colName}
                        </span>
                      </button>

                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                          #{orderIdx + 1}
                        </span>
                        <button
                          type="button"
                          disabled={orderIdx <= 0}
                          onClick={() => moveCardProperty(orderIdx, 'up')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 rounded transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={orderIdx >= cardProperties.length - 1}
                          onClick={() => moveCardProperty(orderIdx, 'down')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 rounded transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unselected / Hidden Properties */}
            {availableColumns.filter((c) => !cardProperties.includes(c)).length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Available Columns
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {availableColumns
                    .filter((c) => !cardProperties.includes(c))
                    .map((colName) => (
                      <button
                        key={colName}
                        type="button"
                        onClick={() => toggleCardProperty(colName)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 bg-slate-50/80 dark:bg-slate-950/60 text-xs text-left transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
                          <span className="text-slate-600 dark:text-slate-400 truncate">
                            {colName === 'content' ? 'Content' : colName}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          + Add
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Unified View Group By Selector */}
      <div className="flex items-center gap-1.5 ml-auto">
        <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span className="text-slate-600 dark:text-slate-400 font-medium">Group By:</span>
        <select
          value={groupByColumnId || ''}
          onChange={(e) => onUpdateGroupBy(e.target.value ? Number(e.target.value) : null)}
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
        >
          {viewType === 'grid' && (
            <option value="">No Grouping (Flat Table)</option>
          )}
          {groupableColumns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name} ({col.type})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
