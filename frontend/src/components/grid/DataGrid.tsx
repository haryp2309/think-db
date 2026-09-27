import React, { useState, useEffect } from 'react';
import {
  TableSchema,
  RowItem,
  PropertyType,
  ColumnMeta
} from '../../types';
import {
  StringCell,
  EnumCell,
  TagsCell,
  ReferenceCell,
  RollupCell,
  AggregatedRelationCell
} from './CellEditors';
import {
  Plus,
  Type,
  List,
  Tag,
  Link2,
  FileText,
  Trash2,
  ExternalLink,
  Download,
  CheckSquare,
  Square,
  Calculator,
  ChevronDown,
  ChevronRight,
  Layers,
  Settings2,
  Lock
} from 'lucide-react';

import { BatchPropertyEditMenu } from '../views/BatchPropertyEditMenu';

interface DataGridProps {
  schema: TableSchema;
  rows: RowItem[];
  selectedRowIds: number[];
  groupByColumnId?: number | null;
  cardProperties?: string[];
  onToggleSelectRow: (id: number) => void;
  onToggleSelectAll: () => void;
  onUpdateCell: (rowId: number, propertyName: string, newValue: any) => void;
  onUpdateRowTitle: (rowId: number, newTitle: string) => void;
  onUpdateTitleAlias?: (newAlias: string) => void;
  onDeleteRow: (rowId: number) => void;
  onDeleteSelectedRows: () => void;
  onOpenRowDetail: (row: RowItem) => void;
  onAddNewRow: (seedProps?: Record<string, any>) => void;
  onOpenAddProperty: () => void;
  onOpenEditProperty?: (column: ColumnMeta) => void;
  onOpenExportModal: () => void;
  onBatchUpdateProperty?: (propertyName: string, newValue: any) => void;
  autoEditRowId?: number | null;
  onClearAutoEdit?: () => void;
}


export const DataGrid: React.FC<DataGridProps> = ({
  schema,
  rows,
  selectedRowIds,
  groupByColumnId,
  cardProperties = [],
  onToggleSelectRow,
  onToggleSelectAll,
  onUpdateCell,
  onUpdateRowTitle,
  onUpdateTitleAlias,
  onDeleteRow,
  onDeleteSelectedRows,
  onOpenRowDetail,
  onAddNewRow,
  onOpenAddProperty,
  onOpenEditProperty,
  onOpenExportModal,
  onBatchUpdateProperty,
  autoEditRowId,
  onClearAutoEdit,
}) => {

  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [isEditingTitleAlias, setIsEditingTitleAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState(schema.title_alias || 'Title');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (autoEditRowId) {
      setEditingTitleId(autoEditRowId);
      const targetRow = rows.find((r) => r.id === autoEditRowId);
      setTitleInput(targetRow?.title || 'New Page');
    }
  }, [autoEditRowId, rows]);

  const columns = schema.columns || [];
  type DisplayItem = { type: 'column'; col: ColumnMeta } | { type: 'content' };

  const getDisplayItems = (): DisplayItem[] => {
    if (cardProperties !== undefined && Array.isArray(cardProperties)) {
      const items: DisplayItem[] = [];
      const seenNames = new Set<string>();
      for (const propName of cardProperties) {
        if (propName === 'content') {
          if (!seenNames.has('content')) {
            seenNames.add('content');
            items.push({ type: 'content' });
          }
        } else {
          const col = columns.find((c) => c.name === propName);
          if (col && !seenNames.has(col.name)) {
            seenNames.add(col.name);
            items.push({ type: 'column', col });
          }
        }
      }
      return items;
    }
    return [
      ...columns.map((col): DisplayItem => ({ type: 'column', col })),
      { type: 'content' },
    ];
  };
  const displayItems = getDisplayItems();

  const allSelected = rows.length > 0 && selectedRowIds.length === rows.length;
  const titleLabel = schema.title_alias || 'Title';


  const groupColumn = columns.find((c) => c.id === groupByColumnId);

  const getTypeIcon = (type: PropertyType) => {
    switch (type) {
      case 'string':
        return <Type className="w-3.5 h-3.5 text-slate-400" />;
      case 'enum':
        return <List className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
      case 'tags':
        return <Tag className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
      case 'reference':
        return <Link2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />;
      case 'referenced':
        return <Link2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
      case 'rollup':
        return <Calculator className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
      default:
        return <Type className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Group rows if groupColumn is present
  const groupedRows: { groupName: string; items: RowItem[] }[] = [];
  if (groupColumn) {
    const groupMap: Record<string, RowItem[]> = {};
    const options = groupColumn.options.length > 0 ? groupColumn.options : ['Unassigned'];

    options.forEach((opt) => {
      groupMap[opt] = [];
    });
    groupMap['Unassigned'] = [];

    rows.forEach((r) => {
      const val = r.properties ? r.properties[groupColumn.name] : undefined;
      if (Array.isArray(val) && val.length > 0) {
        val.forEach((v) => {
          if (!groupMap[v]) groupMap[v] = [];
          groupMap[v].push(r);
        });
      } else if (val) {
        const strVal = String(val);
        if (!groupMap[strVal]) groupMap[strVal] = [];
        groupMap[strVal].push(r);
      } else {
        groupMap['Unassigned'].push(r);
      }
    });

    Object.keys(groupMap).forEach((g) => {
      if (groupMap[g].length > 0 || options.includes(g)) {
        groupedRows.push({ groupName: g, items: groupMap[g] });
      }
    });
  } else {
    groupedRows.push({ groupName: 'All Items', items: rows });
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      {/* Action Bar */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
            {rows.length} {rows.length === 1 ? 'row' : 'rows'}
          </span>

          {selectedRowIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 text-[11px] px-2 py-0.5 rounded-full font-medium">
                {selectedRowIds.length} selected
              </span>

              {onBatchUpdateProperty && (
                <BatchPropertyEditMenu
                  schema={schema}
                  selectedCount={selectedRowIds.length}
                  onApply={onBatchUpdateProperty}
                />
              )}

              <button
                onClick={onDeleteSelectedRows}
                className="flex items-center gap-1 bg-red-100 dark:bg-red-600/20 hover:bg-red-200 dark:hover:bg-red-600/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30 text-[11px] px-2.5 py-0.5 rounded-md font-medium transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}

        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-medium transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Export Polars CSV</span>
          </button>
          <button
            onClick={() => onAddNewRow()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Row</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-auto border-t border-slate-200 dark:border-slate-900">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-100 dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-medium sticky top-0 z-20">
              <th className="w-10 px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-800/60">
                <button
                  onClick={onToggleSelectAll}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>

              <th className="w-16 px-3 py-2.5 font-mono text-[11px] border-r border-slate-200 dark:border-slate-800/60 text-slate-400 dark:text-slate-500">
                # ID
              </th>

              <th className="min-w-[220px] px-3 py-2.5 border-r border-slate-200 dark:border-slate-800/60 group/titlehead">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Type className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    {isEditingTitleAlias ? (
                      <input
                        type="text"
                        value={aliasInput}
                        onChange={(e) => setAliasInput(e.target.value)}
                        onBlur={() => {
                          if (onUpdateTitleAlias && aliasInput.trim()) {
                            onUpdateTitleAlias(aliasInput.trim());
                          }
                          setIsEditingTitleAlias(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (onUpdateTitleAlias && aliasInput.trim()) {
                              onUpdateTitleAlias(aliasInput.trim());
                            }
                            setIsEditingTitleAlias(false);
                          }
                        }}
                        autoFocus
                        className="bg-white dark:bg-slate-950 border border-blue-500 text-xs px-1.5 py-0.5 rounded focus:outline-none w-full"
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setAliasInput(schema.title_alias || 'Title');
                          setIsEditingTitleAlias(true);
                        }}
                        className="font-medium truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        title="Click to visually rename title column"
                      >
                        {titleLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] uppercase font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800/80 px-1 py-0.5 rounded shrink-0">
                    title
                  </span>
                </div>
              </th>

              {displayItems.map((item) => {
                if (item.type === 'content') {
                  return (
                    <th key="content-col" className="min-w-[200px] px-3 py-2.5 border-r border-slate-200 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Content (Markdown)</span>
                      </div>
                    </th>
                  );
                }

                const col = item.col;
                return (
                  <th key={col.id} className="min-w-[170px] px-3 py-2.5 border-r border-slate-200 dark:border-slate-800/60 group/col">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {col.is_inverse || col.type === 'referenced' ? (
                          <Link2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          getTypeIcon(col.type)
                        )}
                        <span className="truncate">{col.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {col.is_inverse || col.type === 'referenced' || col.is_readonly ? (
                          <span
                            className="text-[9px] uppercase font-mono text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 px-1 py-0.5 rounded font-semibold flex items-center gap-0.5"
                            title="Read-only referenced relation column showing rows referencing this item from another table"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            Readonly Ref
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800/80 px-1 py-0.5 rounded">
                            {col.type}
                          </span>
                        )}
                        {onOpenEditProperty && !col.is_inverse && col.type !== 'referenced' && !col.is_readonly && (
                          <button
                            type="button"
                            onClick={() => onOpenEditProperty(col)}
                            className="opacity-0 group-hover/col:opacity-100 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-opacity"
                            title="Edit property settings & defaults"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}

              <th className="w-36 px-3 py-2.5">
                <button
                  onClick={onOpenAddProperty}
                  className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Property</span>
                </button>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-xs">
            {groupedRows.map((group) => {
              const isCollapsed = collapsedGroups[group.groupName];

              return (
                <React.Fragment key={group.groupName}>
                  {/* Render Group Section Header if Grouping Active */}
                  {groupColumn && (
                    <tr className="bg-slate-100/80 dark:bg-slate-900/60 font-semibold text-slate-700 dark:text-slate-300 border-y border-slate-200 dark:border-slate-800/80">
                      <td colSpan={displayItems.length + 4} className="px-3 py-2">
                        <div
                          onClick={() => toggleGroupCollapse(group.groupName)}
                          className="flex items-center gap-2 cursor-pointer select-none"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            {groupColumn.name}: <strong className="text-slate-900 dark:text-slate-100">{group.groupName}</strong>
                          </span>
                          <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded-full ml-1">
                            {group.items.length}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isCollapsed &&
                    group.items.map((r) => {
                      const isSelected = selectedRowIds.includes(r.id);

                      return (
                        <tr
                          key={r.id}
                          className={`group transition-colors ${
                            isSelected
                              ? 'bg-blue-50/60 dark:bg-blue-950/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          <td className="px-3 py-2 text-center border-r border-slate-200 dark:border-slate-800/40">
                            <button
                              onClick={() => onToggleSelectRow(r.id)}
                              className="text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="px-3 py-2 font-mono text-[11px] text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-800/40">
                            {r.id}
                          </td>

                          <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800/40">
                            <div className="flex items-center justify-between gap-2 group/title">
                              {editingTitleId === r.id ? (
                                <input
                                  type="text"
                                  value={titleInput}
                                  onChange={(e) => setTitleInput(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={() => {
                                    onUpdateRowTitle(r.id, titleInput);
                                    setEditingTitleId(null);
                                    if (onClearAutoEdit) onClearAutoEdit();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      onUpdateRowTitle(r.id, titleInput);
                                      setEditingTitleId(null);
                                      if (onClearAutoEdit) onClearAutoEdit();
                                    }
                                  }}
                                  autoFocus
                                  className="w-full bg-white dark:bg-slate-900 border border-blue-500 text-xs text-slate-900 dark:text-slate-100 px-2 py-1 rounded focus:outline-none"
                                />
                              ) : (
                                <span
                                  onClick={() => {
                                    setEditingTitleId(r.id);
                                    setTitleInput(r.title);
                                  }}
                                  className="font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 cursor-pointer truncate flex items-center gap-1.5"
                                >
                                  {r.emoji && <span className="text-sm shrink-0">{r.emoji}</span>}
                                  <span className="truncate">{r.title || <span className="text-slate-400 dark:text-slate-600 italic">Untitled</span>}</span>
                                </span>
                              )}

                              <button
                                onClick={() => onOpenRowDetail(r)}
                                className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-all shrink-0"
                                title="Open page drawer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {displayItems.map((item) => {
                            if (item.type === 'content') {
                              return (
                                <td key="content-cell" className="px-3 py-2 border-r border-slate-200 dark:border-slate-800/40 text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                                  {r.content ? (
                                    <span className="truncate block font-mono text-[11px] text-slate-600 dark:text-slate-400 opacity-90">
                                      {r.content.replace(/[#*`\-[\]]/g, '').slice(0, 45)}...
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600 italic">Empty markdown</span>
                                  )}
                                </td>
                              );
                            }

                            const col = item.col;
                            const rawVal = r.properties ? r.properties[col.name] : undefined;

                            return (
                              <td key={col.id} className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-800/40 align-middle">
                                {col.is_inverse || col.type === 'referenced' ? (
                                  <AggregatedRelationCell column={col} row={r} />
                                ) : (
                                  <>
                                    {col.type === 'string' && (
                                      <StringCell
                                        column={col}
                                        value={rawVal}
                                        onChange={(nv) => onUpdateCell(r.id, col.name, nv)}
                                      />
                                    )}
                                    {col.type === 'enum' && (
                                      <EnumCell
                                        column={col}
                                        value={rawVal}
                                        onChange={(nv) => onUpdateCell(r.id, col.name, nv)}
                                      />
                                    )}
                                    {col.type === 'tags' && (
                                      <TagsCell
                                        column={col}
                                        value={rawVal}
                                        onChange={(nv) => onUpdateCell(r.id, col.name, nv)}
                                      />
                                    )}
                                    {col.type === 'reference' && (
                                      <ReferenceCell
                                        column={col}
                                        value={rawVal}
                                        onChange={(nv) => onUpdateCell(r.id, col.name, nv)}
                                      />
                                    )}
                                    {col.type === 'rollup' && (
                                      <RollupCell column={col} row={r} />
                                    )}
                                  </>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this row?')) {
                                  onDeleteRow(r.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-opacity"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {/* Group Section "New Row" — seeded with this group's value */}
                  {groupColumn && !isCollapsed && (
                    <tr>
                      <td colSpan={displayItems.length + 4} className="px-3 py-1.5">
                        <button
                          onClick={() => {
                            const seedVal =
                              groupColumn.type === 'tags'
                                ? [group.groupName]
                                : group.groupName;
                            onAddNewRow({ [groupColumn.name]: seedVal });
                          }}
                          className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-medium transition-colors pl-6"
                        >
                          <Plus className="w-3 h-3" />
                          <span>New row in {group.groupName}</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            <tr>
              <td colSpan={displayItems.length + 4} className="px-3 py-2.5">
                <button
                  onClick={() => onAddNewRow()}
                  className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Row</span>
                </button>
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
};
