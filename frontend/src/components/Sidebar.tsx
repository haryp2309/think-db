import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  Database,
  Trash2,
  Sparkles,
  ChevronRight,
  FolderPlus,
  Table2,
  Kanban,
  X,
  Pencil,
  GripVertical
} from 'lucide-react';
import { NamespaceSchema, TableSummary, ViewSchema } from '../types';
import { EditViewModal } from './views/EditViewModal';

interface SidebarProps {
  namespaces: NamespaceSchema[];
  tables: TableSummary[];
  activeTableId: number | null;
  activeViewId: number | null;
  onSelectTable: (tableId: number) => void;
  onSelectView: (view: ViewSchema) => void;
  onCreateNamespace: (name: string, emoji?: string) => void;
  onUpdateNamespace: (nsId: number, data: { name?: string; emoji?: string; is_collapsed?: boolean }) => void;
  onDeleteNamespace: (nsId: number) => void;
  onCreateTable: (name: string, emoji?: string, namespaceId?: number | null) => void;
  onUpdateTable: (tableId: number, data: { name?: string; emoji?: string; namespace_id?: number | null }) => void;
  onDeleteTable: (tableId: number) => void;
  onCreateView: (tableId: number, data: { name: string; emoji: string; type: 'grid' | 'kanban' }) => void;
  onUpdateView: (viewId: number, data: { name?: string; emoji?: string; type?: 'grid' | 'kanban' }) => void;
  onDeleteView: (viewId: number) => void;
  onMoveTableToNamespace: (tableId: number, targetNamespaceId: number) => void;
  onReorderViews: (tableId: number, viewIds: number[]) => void;
}

const EMOJI_OPTIONS = ['📁', '🚀', '📋', '👥', '⚡', '🐞', '📌', '🎯', '📊', '📑', '🌟', '⚙️', '📂', '💡', '🏷️'];

// ── Custom Emoji Picker Component ─────────────────────────────────────────────

interface CustomEmojiPickerProps {
  selectedEmoji: string;
  onSelectEmoji: (emoji: string) => void;
}

const CustomEmojiPicker: React.FC<CustomEmojiPickerProps> = ({ selectedEmoji, onSelectEmoji }) => {
  const [customInput, setCustomInput] = useState('');

  const applyCustom = () => {
    const seg = new Intl.Segmenter().segment(customInput);
    const first = [...seg][0]?.segment ?? '';
    if (first) {
      onSelectEmoji(first);
      setCustomInput('');
    }
  };

  return (
    <div className="space-y-2 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
      {/* Custom Emoji Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => {
            const seg = new Intl.Segmenter().segment(e.target.value);
            const first = [...seg][0]?.segment ?? '';
            setCustomInput(first);
          }}
          placeholder="Type any emoji…"
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyCustom();
            }
          }}
        />
        <button
          type="button"
          onClick={applyCustom}
          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0"
        >
          Set Custom
        </button>
      </div>

      {/* Preset Quick Selection */}
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
        {EMOJI_OPTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onSelectEmoji(e)}
            className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-transform ${
              selectedEmoji === e ? 'bg-blue-600 scale-110 shadow text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  namespaces,
  tables,
  activeTableId,
  activeViewId,
  onSelectTable,
  onSelectView,
  onCreateNamespace,
  onUpdateNamespace,
  onDeleteNamespace,
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
  onCreateView,
  onUpdateView,
  onDeleteView,
  onMoveTableToNamespace,
  onReorderViews,
}) => {
  const [search, setSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<number, boolean>>({});
  const [dragOverNsId, setDragOverNsId] = useState<number | null>(null);
  const [dragOverViewId, setDragOverViewId] = useState<number | null>(null);
  const [editingView, setEditingView] = useState<ViewSchema | null>(null);

  const handleReorderView = (tableId: number, draggedViewId: number, targetViewId: number) => {
    const targetTable = tables.find((t) => t.id === tableId);
    if (!targetTable || !targetTable.views) return;
    const currentViews = [...targetTable.views];
    const draggedIdx = currentViews.findIndex((v) => v.id === draggedViewId);
    const targetIdx = currentViews.findIndex((v) => v.id === targetViewId);
    if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return;

    const [removed] = currentViews.splice(draggedIdx, 1);
    currentViews.splice(targetIdx, 0, removed);

    const newViewIds = currentViews.map((v) => v.id);
    onReorderViews(tableId, newViewIds);
  };

  // Modals state: Create Namespace
  const [showNsModal, setShowNsModal] = useState(false);
  const [nsName, setNsName] = useState('');
  const [nsEmoji, setNsEmoji] = useState('📁');

  // Edit Namespace
  const [editingNs, setEditingNs] = useState<NamespaceSchema | null>(null);
  const [editNsName, setEditNsName] = useState('');
  const [editNsEmoji, setEditNsEmoji] = useState('📁');

  // Create Table
  const [showTblModal, setShowTblModal] = useState(false);
  const [tblTargetNsId, setTblTargetNsId] = useState<number | null>(null);
  const [tblName, setTblName] = useState('');
  const [tblEmoji, setTblEmoji] = useState('📁');

  // Edit Table
  const [editingTbl, setEditingTbl] = useState<TableSummary | null>(null);
  const [editTblName, setEditTblName] = useState('');
  const [editTblEmoji, setEditTblEmoji] = useState('📁');

  // Create View
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTargetTblId, setViewTargetTblId] = useState<number | null>(null);
  const [viewName, setViewName] = useState('');
  const [viewEmoji, setViewEmoji] = useState('📋');
  const [viewType, setViewType] = useState<'grid' | 'kanban'>('grid');

  const toggleTableExpand = (tableId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTables((prev) => ({ ...prev, [tableId]: !(prev[tableId] ?? true) }));
  };

  const handleCreateNamespaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nsName.trim()) return;
    onCreateNamespace(nsName.trim(), nsEmoji || '📁');
    setNsName('');
    setNsEmoji('📁');
    setShowNsModal(false);
  };

  const handleEditNamespaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNs || !editNsName.trim()) return;
    onUpdateNamespace(editingNs.id, { name: editNsName.trim(), emoji: editNsEmoji || '📁' });
    setEditingNs(null);
  };

  const handleCreateTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tblName.trim()) return;
    onCreateTable(tblName.trim(), tblEmoji || '📁', tblTargetNsId);
    setTblName('');
    setTblEmoji('📁');
    setShowTblModal(false);
  };

  const handleEditTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTbl || !editTblName.trim()) return;
    onUpdateTable(editingTbl.id, { name: editTblName.trim(), emoji: editTblEmoji || '📁' });
    setEditingTbl(null);
  };

  const handleCreateViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewName.trim() || !viewTargetTblId) return;
    onCreateView(viewTargetTblId, { name: viewName.trim(), emoji: viewEmoji || '📋', type: viewType });
    setViewName('');
    setViewEmoji('📋');
    setShowViewModal(false);
  };

  return (
    <aside className="w-72 bg-slate-50 dark:bg-[#161616] border-r border-slate-200 dark:border-zinc-800 flex flex-col h-screen select-none shrink-0 transition-colors text-slate-800 dark:text-zinc-200">
      {/* Workspace Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
              Think DB <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Dynamic SQLite Engine</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNsModal(true)}
          title="Create New Namespace"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search namespaces, tables, views..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Tree Hierarchy: Namespace -> Table -> View Subpages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {namespaces.map((ns) => {
          const isCollapsed = ns.is_collapsed;
          const isDragOver = dragOverNsId === ns.id;

          const matchingTables = ns.tables.filter(
            (t) =>
              t.name.toLowerCase().includes(search.toLowerCase()) ||
              (t.views || []).some((v) => v.name.toLowerCase().includes(search.toLowerCase()))
          );

          if (search && matchingTables.length === 0 && !ns.name.toLowerCase().includes(search.toLowerCase())) {
            return null;
          }

          return (
            <div
              key={ns.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverNsId !== ns.id) setDragOverNsId(ns.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverNsId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverNsId(null);
                try {
                  const raw = e.dataTransfer.getData('application/json');
                  if (raw) {
                    const data = JSON.parse(raw);
                    if (data.tableId && data.sourceNsId !== ns.id) {
                      onMoveTableToNamespace(data.tableId, ns.id);
                    }
                  }
                } catch (err) {
                  console.error('Failed to parse drag drop data', err);
                }
              }}
              className={`space-y-1.5 p-1.5 rounded-xl transition-all ${
                isDragOver
                  ? 'ring-2 ring-blue-500/60 bg-blue-500/10 dark:bg-blue-600/10'
                  : 'bg-transparent'
              }`}
            >
              {/* Muted / Greyed-out Namespace Header */}
              <div className="group flex items-center justify-between px-1 py-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/40 text-xs transition-colors cursor-pointer">
                <div
                  onClick={() => onUpdateNamespace(ns.id, { is_collapsed: !isCollapsed })}
                  className="flex items-center gap-1.5 flex-1 min-w-0"
                >
                  {isCollapsed && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  )}
                  <span className="text-sm shrink-0">{ns.emoji || '📁'}</span>
                  <span className="truncate uppercase text-[11px] tracking-wider text-slate-400 dark:text-slate-500 font-semibold group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    {ns.name}
                  </span>
                  <span className="text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800/80 px-1.5 py-0.2 rounded-full text-slate-400 dark:text-slate-500 ml-1">
                    {ns.tables.length}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {/* Edit Namespace */}
                  <button
                    type="button"
                    title="Edit Namespace"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNs(ns);
                      setEditNsName(ns.name);
                      setEditNsEmoji(ns.emoji || '📁');
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {/* Add Table to Namespace */}
                  <button
                    type="button"
                    title="Add Table to Namespace"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTblTargetNsId(ns.id);
                      setShowTblModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  {/* Delete Namespace */}
                  {namespaces.length > 1 && (
                    <button
                      type="button"
                      title="Delete Namespace"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNamespace(ns.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Unindented Tables under Namespace (Smooth Accordion Transition) */}
              <div
                className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isCollapsed
                    ? 'grid-rows-[0fr] opacity-0 pointer-events-none mt-0'
                    : 'grid-rows-[1fr] opacity-100 mt-1'
                }`}
              >
                <div className="overflow-hidden space-y-1">
                  {matchingTables.map((tbl) => {
                    const isTableActive = tbl.id === activeTableId;
                    const isTableExpanded = expandedTables[tbl.id] ?? true;
                    const views = tbl.views || [];

                    return (
                      <div key={tbl.id} className="space-y-0.5">
                        {/* Table Header Row (Unindented, Draggable, Smooth Hover) */}
                        <div
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({ tableId: tbl.id, sourceNsId: ns.id })
                            );
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onClick={() => onSelectTable(tbl.id)}
                          className={`group flex items-center justify-between px-1 py-1.5 rounded-lg cursor-pointer text-xs font-medium transition-all duration-150 ease-out hover:translate-x-0.5 active:scale-[0.99] ${
                            isTableActive
                              ? 'bg-blue-100/70 dark:bg-blue-600/15 text-blue-900 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-500/30 shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {views.length > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => toggleTableExpand(tbl.id, e)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-transform duration-200"
                              >
                                <ChevronRight
                                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                                    isTableExpanded ? 'rotate-90' : 'rotate-0'
                                  }`}
                                />
                              </button>
                            ) : (
                              <div className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="text-sm shrink-0 transition-transform duration-150 group-hover:scale-110">{tbl.emoji || '📁'}</span>
                            <span className="truncate">{tbl.name}</span>
                          </div>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {/* Drag Handle */}
                            <GripVertical className="w-3 h-3 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab shrink-0 mr-0.5" />
                            {/* Edit Table */}
                            <button
                              type="button"
                              title="Edit Table"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTbl(tbl);
                                setEditTblName(tbl.name);
                                setEditTblEmoji(tbl.emoji || '📁');
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {/* Add View Subpage */}
                            <button
                              type="button"
                              title="Add View Subpage"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewTargetTblId(tbl.id);
                                setShowViewModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            {/* Delete Table */}
                            <button
                              type="button"
                              title="Delete Table"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete table "${tbl.name}" and all its rows?`)) {
                                  onDeleteTable(tbl.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Views as Subpages under Table (Smooth Accordion Transition) */}
                        {views.length > 0 && (
                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                              isTableExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                            }`}
                          >
                            <div className="overflow-hidden pl-5 space-y-0.5 border-l border-slate-200 dark:border-slate-800/80 ml-3">
                              {views.map((v) => {
                                const isViewActive = v.id === activeViewId;
                                const ViewIcon = v.type === 'kanban' ? Kanban : Table2;
                                const isViewDragOver = dragOverViewId === v.id;

                                return (
                                  <div
                                    key={v.id}
                                    draggable={true}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      e.dataTransfer.setData(
                                        'application/json',
                                        JSON.stringify({ type: 'VIEW', viewId: v.id, tableId: tbl.id })
                                      );
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.dataTransfer.dropEffect = 'move';
                                      if (dragOverViewId !== v.id) setDragOverViewId(v.id);
                                    }}
                                    onDragLeave={(e) => {
                                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setDragOverViewId(null);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDragOverViewId(null);
                                      try {
                                        const raw = e.dataTransfer.getData('application/json');
                                        if (raw) {
                                          const data = JSON.parse(raw);
                                          if (data.type === 'VIEW' && data.tableId === tbl.id && data.viewId !== v.id) {
                                            handleReorderView(tbl.id, data.viewId, v.id);
                                          }
                                        }
                                      } catch (err) {
                                        console.error('Failed to parse view drag data', err);
                                      }
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectTable(tbl.id);
                                      onSelectView(v);
                                    }}
                                    className={`group flex items-center justify-between px-2 py-1 rounded-md text-[11px] cursor-pointer transition-all duration-150 ease-out hover:translate-x-1 active:scale-[0.98] ${
                                      isViewDragOver
                                        ? 'ring-2 ring-blue-500 bg-blue-500/20 text-blue-900 dark:text-blue-200'
                                        : isViewActive
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <GripVertical className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 cursor-grab shrink-0 transition-opacity" />
                                      <span className="text-xs leading-none">{v.emoji || '📋'}</span>
                                      <span className="truncate">{v.name}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <ViewIcon className={`w-3 h-3 ${isViewActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                      <button
                                        type="button"
                                        title="Edit View"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingView(v);
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all duration-150 ${
                                          isViewActive
                                            ? 'hover:bg-blue-700 text-white'
                                            : 'hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500'
                                        }`}
                                      >
                                        <Pencil className="w-2.5 h-2.5" />
                                      </button>
                                      {views.length > 1 && (
                                        <button
                                          type="button"
                                          title="Delete View"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteView(v.id);
                                          }}
                                          className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all duration-150 ${
                                            isViewActive
                                              ? 'hover:bg-blue-700 text-white'
                                              : 'hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500'
                                          }`}
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Namespace */}
      {showNsModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/50 dark:bg-black/75 flex items-center justify-center p-4 animate-backdrop-fade">
            <div className="bg-white dark:bg-[#191919] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-modal-pop">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="text-base">{nsEmoji}</span> Create New Namespace
                </h3>
                <button
                  onClick={() => setShowNsModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNamespaceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Namespace Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Workspace, Operations, Sales..."
                    value={nsName}
                    onChange={(e) => setNsName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Emoji Icon
                  </label>
                  <CustomEmojiPicker selectedEmoji={nsEmoji} onSelectEmoji={setNsEmoji} />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowNsModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!nsName.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 shadow-sm transition-all active:scale-95"
                  >
                    Create Namespace
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Edit Namespace */}
      {editingNs &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/50 dark:bg-black/75 flex items-center justify-center p-4 animate-backdrop-fade">
            <div className="bg-white dark:bg-[#191919] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-modal-pop">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="text-base">{editNsEmoji}</span> Edit Namespace
                </h3>
                <button
                  onClick={() => setEditingNs(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditNamespaceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Namespace Name
                  </label>
                  <input
                    type="text"
                    value={editNsName}
                    onChange={(e) => setEditNsName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Emoji Icon
                  </label>
                  <CustomEmojiPicker selectedEmoji={editNsEmoji} onSelectEmoji={setEditNsEmoji} />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingNs(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editNsName.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 shadow-sm transition-all active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Create Table */}
      {showTblModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/50 dark:bg-black/75 flex items-center justify-center p-4 animate-backdrop-fade">
            <div className="bg-white dark:bg-[#191919] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-modal-pop">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="text-base">{tblEmoji}</span> Create New Table
                </h3>
                <button
                  onClick={() => setShowTblModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTableSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Table Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tasks, Contacts, Inventory..."
                    value={tblName}
                    onChange={(e) => setTblName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Emoji Icon
                  </label>
                  <CustomEmojiPicker selectedEmoji={tblEmoji} onSelectEmoji={setTblEmoji} />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTblModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!tblName.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 shadow-sm transition-all active:scale-95"
                  >
                    Create Table
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Edit Table */}
      {editingTbl &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/50 dark:bg-black/75 flex items-center justify-center p-4 animate-backdrop-fade">
            <div className="bg-white dark:bg-[#191919] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-modal-pop">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="text-base">{editTblEmoji}</span> Edit Table
                </h3>
                <button
                  onClick={() => setEditingTbl(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditTableSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Table Name
                  </label>
                  <input
                    type="text"
                    value={editTblName}
                    onChange={(e) => setEditTblName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Emoji Icon
                  </label>
                  <CustomEmojiPicker selectedEmoji={editTblEmoji} onSelectEmoji={setEditTblEmoji} />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingTbl(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editTblName.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 shadow-sm transition-all active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Create View Subpage */}
      {showViewModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/50 dark:bg-black/75 flex items-center justify-center p-4 animate-backdrop-fade">
            <div className="bg-white dark:bg-[#191919] border border-slate-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-modal-pop">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="text-base">{viewEmoji}</span> Create View Subpage
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateViewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    View Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Active Sprint, Kanban Board..."
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Layout Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setViewType('grid')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        viewType === 'grid'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Table2 className="w-4 h-4" /> Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewType('kanban')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        viewType === 'kanban'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Kanban className="w-4 h-4" /> Kanban
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Emoji Icon
                  </label>
                  <CustomEmojiPicker selectedEmoji={viewEmoji} onSelectEmoji={setViewEmoji} />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowViewModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!viewName.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 shadow-sm transition-all active:scale-95"
                  >
                    Create View
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {editingView && (
        <EditViewModal
          view={editingView}
          onClose={() => setEditingView(null)}
          onSubmit={(data) => onUpdateView(editingView.id, data)}
          onDelete={(vId) => onDeleteView(vId)}
          canDelete={tables.find((t) => t.id === editingView.table_id)?.views ? (tables.find((t) => t.id === editingView.table_id)?.views?.length || 0) > 1 : true}
        />
      )}
    </aside>
  );
};
