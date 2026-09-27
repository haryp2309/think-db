import React, { useState } from 'react';
import { ColumnMeta, RowItem, TableSchema } from '../../types';
import { Plus, Tag, ExternalLink, Sparkles, Edit2, Link2 } from 'lucide-react';
import { StringCell, EnumCell, TagsCell, ReferenceCell, RollupCell, AggregatedRelationCell } from '../grid/CellEditors';

interface KanbanViewProps {
  schema: TableSchema;
  rows: RowItem[];
  groupByColumnId?: number | null;
  cardProperties?: string[];
  onOpenRowDetail: (row: RowItem) => void;
  onUpdateCell: (rowId: number, propertyName: string, newValue: any) => void;
  onUpdateRowTitle?: (rowId: number, newTitle: string) => void;
  onAddNewRow: (seedProps?: Record<string, any>) => void;
  onSelectGroupColumn?: (columnId: number) => void;
  selectedRowIds?: number[];
  onToggleSelectRow?: (rowId: number) => void;
  autoEditRowId?: number | null;
  onClearAutoEdit?: () => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  schema,
  rows,
  groupByColumnId,
  cardProperties,
  onOpenRowDetail,
  onUpdateCell,
  onUpdateRowTitle,
  onAddNewRow,
  selectedRowIds,
  onToggleSelectRow,
  autoEditRowId,
  onClearAutoEdit,
}) => {
  const [draggedRowId, setDraggedRowId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [titleInput, setTitleInput] = useState('');

  React.useEffect(() => {
    if (autoEditRowId) {
      setEditingTitleId(autoEditRowId);
      const targetRow = rows.find((r) => r.id === autoEditRowId);
      setTitleInput(targetRow?.title || 'New Page');
    }
  }, [autoEditRowId, rows]);



  // Available candidate columns for grouping (enum or tags)
  const groupableColumns = schema.columns.filter(
    (c) => c.type === 'enum' || c.type === 'tags'
  );

  // Active grouping column: based on view's groupByColumnId or first candidate
  const activeGroupColumn =
    schema.columns.find((c) => c.id === groupByColumnId) ||
    groupableColumns[0];

  if (!activeGroupColumn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-950 transition-colors">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-1">No Groupable Property Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
          Add an Enum or Tags column to your table to visualize rows in a Kanban Board.
        </p>
      </div>
    );
  }

  const groupOptions = activeGroupColumn.options.length > 0 ? activeGroupColumn.options : ['Unassigned'];

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, rowId: number) => {
    e.dataTransfer.setData('text/plain', String(rowId));
    setDraggedRowId(rowId);
  };

  const handleDragOver = (e: React.DragEvent, option: string) => {
    e.preventDefault();
    setDragOverCol(option);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, targetOption: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const rowIdStr = e.dataTransfer.getData('text/plain');
    const rowId = Number(rowIdStr);

    if (rowId) {
      const targetRow = rows.find((r) => r.id === rowId);
      if (targetRow) {
        const currentVal = targetRow.properties ? targetRow.properties[activeGroupColumn.name] : null;

        if (activeGroupColumn.type === 'tags') {
          let nextTags: string[];
          if (Array.isArray(currentVal)) {
            if (!currentVal.includes(targetOption)) {
              nextTags = [targetOption];
            } else {
              nextTags = currentVal;
            }
          } else {
            nextTags = [targetOption];
          }
          onUpdateCell(rowId, activeGroupColumn.name, nextTags);
        } else {
          // Enum type
          if (String(currentVal) !== targetOption) {
            onUpdateCell(rowId, activeGroupColumn.name, targetOption);
          }
        }
      }
    }
    setDraggedRowId(null);
  };

  // Resolve properties to show on each card in vertical order
  const getDisplayColumns = (): ColumnMeta[] => {
    if (cardProperties !== undefined && Array.isArray(cardProperties)) {
      const cols: ColumnMeta[] = [];
      const seenIds = new Set<number>();
      for (const propName of cardProperties) {
        const col = schema.columns.find((c) => c.name === propName);
        if (col && !seenIds.has(col.id)) {
          seenIds.add(col.id);
          cols.push(col);
        }
      }
      return cols;
    }
    return schema.columns;
  };

  const displayColumns = getDisplayColumns();
  const showContent = cardProperties !== undefined ? cardProperties.includes('content') : true;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      {/* Kanban Columns Drag Area */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 items-start h-full min-w-max">
          {groupOptions.map((opt) => {
            const isColumnOver = dragOverCol === opt;
            const matchingRows = rows.filter((r) => {
              const val = r.properties ? r.properties[activeGroupColumn.name] : undefined;
              if (Array.isArray(val)) {
                return val.includes(opt);
              }
              return String(val || '') === opt;
            });

            return (
              <div
                key={opt}
                onDragOver={(e) => handleDragOver(e, opt)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, opt)}
                className={`w-72 border rounded-2xl flex flex-col max-h-full shrink-0 transition-all duration-200 ${
                  isColumnOver
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.01]'
                    : 'bg-slate-50/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800/80'
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{opt}</h4>
                  </div>
                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-medium">
                    {matchingRows.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[160px]">
                  {matchingRows.map((r) => {
                    const isBeingDragged = draggedRowId === r.id;
                    const isSelected = selectedRowIds ? selectedRowIds.includes(r.id) : false;

                    return (
                      <div
                        key={r.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, r.id)}
                        onClick={() => {
                          if (onToggleSelectRow) onToggleSelectRow(r.id);
                          onOpenRowDetail(r);
                        }}
                        className={`group p-3.5 rounded-xl border cursor-pointer active:cursor-grabbing transition-all duration-200 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-0.5 ${
                          isBeingDragged
                            ? 'opacity-40 border-blue-500 scale-95'
                            : isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-50/20 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/50'
                        }`}
                      >
                        {/* Title & Actions Row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          {editingTitleId === r.id ? (
                            <input
                              type="text"
                              value={titleInput}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setTitleInput(e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => {
                                if (onUpdateRowTitle && titleInput !== r.title) {
                                  onUpdateRowTitle(r.id, titleInput);
                                }
                                setEditingTitleId(null);
                                if (onClearAutoEdit) onClearAutoEdit();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (onUpdateRowTitle && titleInput !== r.title) {
                                    onUpdateRowTitle(r.id, titleInput);
                                  }
                                  setEditingTitleId(null);
                                  if (onClearAutoEdit) onClearAutoEdit();
                                }
                              }}
                              autoFocus
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-blue-500 rounded px-2 py-0.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
                            />
                          ) : (
                            <h5
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTitleId(r.id);
                                setTitleInput(r.title || '');
                              }}
                              className="text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-300 transition-colors line-clamp-2 cursor-text flex-1 flex items-center"
                              title="Click to edit title"
                            >
                              {r.emoji && <span className="mr-1.5 shrink-0 text-sm">{r.emoji}</span>}
                              <span className="truncate">{r.title || <span className="text-slate-400 italic">Untitled</span>}</span>
                            </h5>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRowDetail(r);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0 opacity-0 group-hover:opacity-100"
                            title="Open document view"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Content Snippet */}
                        {showContent && r.content && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 font-mono leading-relaxed">
                            {r.content.replace(/<[^>]*>?/gm, '').replace(/[#*`\-[\]]/g, '')}
                          </p>
                        )}

                        {/* Vertically Stacked Configurable Card Properties */}
                        {displayColumns.length > 0 && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80"
                          >
                            {displayColumns.map((col) => {
                              const rawVal = r.properties ? r.properties[col.name] : undefined;

                              return (
                                <div key={col.id} className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate w-20 shrink-0">
                                    {col.name}:
                                  </span>
                                  <div className="flex-1 min-w-0">
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
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {matchingRows.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-600 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                      Drop card here
                    </div>
                  )}
                </div>

                {/* Column Footer */}
                <div className="p-2 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    onClick={() => {
                      const seedVal =
                        activeGroupColumn.type === 'tags' ? [opt] : opt;
                      onAddNewRow({ [activeGroupColumn.name]: seedVal });
                    }}
                    className="w-full flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs py-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add card</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
