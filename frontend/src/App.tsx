import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  TableSummary,
  TableSchema,
  RowItem,
  PropertyType,
  ColumnMeta,
  ViewSchema,
  FilterRule,
  SortRule,
  OptionWithDefault,
  NamespaceSchema
} from './types';
import {
  fetchTables,
  createTable,
  fetchTableSchema,
  updateTableConfig,
  deleteTable,
  fetchViews,
  createView,
  updateView,
  deleteView,
  addColumn,
  updateColumn,
  deleteColumn,
  fetchRows,
  createRow,
  updateRow,
  deleteRow,
  fetchNamespaces,
  createNamespace,
  updateNamespace,
  deleteNamespace,
  reorderViews,
  batchUpdateRows
} from './services/api';
import { useTheme, ThemePreference } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { ViewTabBar } from './components/views/ViewTabBar';
import { FilterSortToolbar } from './components/views/FilterSortToolbar';
import { DataGrid } from './components/grid/DataGrid';
import { KanbanView } from './components/kanban/KanbanView';
import { AddPropertyModal } from './components/grid/AddPropertyModal';
import { EditPropertyModal } from './components/grid/EditPropertyModal';
import { RowDetailModal } from './components/editor/RowDetailModal';
import { ExportModal } from './components/export/ExportModal';
import {
  Search,
  RefreshCw,
  Database,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save,
  RotateCcw,
  AlertTriangle,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

const EMOJI_PRESETS = ['📁', '🚀', '📋', '👥', '⚡', '🐞', '📌', '🎯', '📊', '📑', '🌟', '⚙️'];

// ── Theme Toggle ─────────────────────────────────────────────────────────────

interface ThemeToggleProps {
  theme: ThemePreference;
  onSetTheme: (t: ThemePreference) => void;
}
const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onSetTheme }) => {
  const cycle: ThemePreference[] = ['system', 'light', 'dark'];
  const next = () => {
    const idx = cycle.indexOf(theme);
    onSetTheme(cycle[(idx + 1) % cycle.length]);
  };
  const label = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={next}
      title={`Theme: ${label} (click to cycle)`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

// ── Emoji Header Picker ───────────────────────────────────────────────────────
interface EmojiHeaderPickerProps {
  emoji: string;
  onChange: (e: string) => void;
}
const EmojiHeaderPicker: React.FC<EmojiHeaderPickerProps> = ({ emoji, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [customInput, setCustomInput] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyCustom = () => {
    const seg = new Intl.Segmenter().segment(customInput);
    const first = [...seg][0]?.segment ?? '';
    if (first) {
      onChange(first);
      setOpen(false);
      setCustomInput('');
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-xl dark:bg-blue-600/20 bg-blue-50 border dark:border-blue-500/30 border-blue-200 flex items-center justify-center text-xl hover:scale-105 transition-transform"
        title="Change table emoji"
      >
        {emoji}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 p-3 dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-200 rounded-xl shadow-2xl w-64 space-y-2">
          {/* Custom input */}
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
              className="flex-1 dark:bg-slate-950 bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg px-2.5 py-1.5 text-base text-center focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyCustom();
              }}
            />
            <button
              type="button"
              onClick={applyCustom}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
            >
              Set
            </button>
          </div>
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_PRESETS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onChange(e);
                  setOpen(false);
                }}
                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                  emoji === e
                    ? 'bg-blue-600 scale-110 ring-1 ring-blue-400'
                    : 'dark:hover:bg-slate-800 hover:bg-slate-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [namespaces, setNamespaces] = useState<NamespaceSchema[]>([]);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [activeTableId, setActiveTableId] = useState<number | null>(null);
  const [activeSchema, setActiveSchema] = useState<TableSchema | null>(null);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Target view ID ref to maintain view selection across table load
  const targetViewIdRef = useRef<number | null>(null);

  // Views state
  const [views, setViews] = useState<ViewSchema[]>([]);
  const [activeView, setActiveView] = useState<ViewSchema | null>(null);

  // Working view configuration (not auto-saved!)
  const [workingFilterConfig, setWorkingFilterConfig] = useState<FilterRule[]>([]);
  const [workingSortConfig, setWorkingSortConfig] = useState<SortRule[]>([]);
  const [workingGroupBy, setWorkingGroupBy] = useState<number | null>(null);
  const [workingType, setWorkingType] = useState<'grid' | 'kanban'>('grid');
  const [workingCardProperties, setWorkingCardProperties] = useState<string[]>([]);
  const [autoEditRowId, setAutoEditRowId] = useState<number | null>(null);

  // Auto-Save Status Badge for row data
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Modals state
  const [detailRow, setDetailRow] = useState<RowItem | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnMeta | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // 1. Initial Load: Fetch list of namespaces & dynamic tables
  const loadNamespacesAndTables = useCallback(async () => {
    try {
      const nsData = await fetchNamespaces();
      setNamespaces(nsData);

      const allTbls = nsData.flatMap((ns) => ns.tables || []);
      setTables(allTbls);

      if (allTbls.length > 0 && activeTableId === null) {
        setActiveTableId(allTbls[0].id);
      }
    } catch (err) {
      console.error('Failed to load namespaces', err);
    }
  }, [activeTableId]);

  useEffect(() => {
    loadNamespacesAndTables();
  }, [loadNamespacesAndTables]);

  // Active view ref to avoid stale closure in loadActiveTableData
  const activeViewRef = useRef<ViewSchema | null>(activeView);
  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  // 2a. Full load: Schema + Views + Rows. Called when active table changes or schema refreshes.
  const loadActiveTableData = useCallback(async () => {
    if (!activeTableId) return;
    setLoading(true);
    try {
      const schemaData = await fetchTableSchema(activeTableId);
      setActiveSchema(schemaData);

      const viewsData = await fetchViews(activeTableId);
      setViews(viewsData);

      if (viewsData.length > 0) {
        const targetId = targetViewIdRef.current;
        targetViewIdRef.current = null;
        const currentActiveView = activeViewRef.current;

        let selectedView: ViewSchema | undefined;

        // 1. Explicit targetViewIdRef (e.g. clicked in sidebar)
        if (targetId) {
          selectedView = viewsData.find((v) => v.id === targetId);
        }
        // 2. Currently active view if it belongs to this table and still exists
        if (!selectedView && currentActiveView && currentActiveView.table_id === activeTableId) {
          selectedView = viewsData.find((v) => v.id === currentActiveView.id);
        }
        // 3. Default view
        if (!selectedView) {
          selectedView = viewsData.find((v) => v.is_default) || viewsData[0];
        }

        const isSameView = currentActiveView && selectedView && currentActiveView.id === selectedView.id;
        setActiveView(selectedView);

        if (!isSameView) {
          setWorkingFilterConfig(selectedView.filter_config || []);
          setWorkingSortConfig(selectedView.sort_config || []);
          setWorkingGroupBy(selectedView.group_by_column_id || null);
          setWorkingType(selectedView.type || 'grid');
          setWorkingCardProperties(selectedView.card_properties ?? ['content', ...schemaData.columns.map((c) => c.name)]);
        }
      }

      const rowsData = await fetchRows(activeTableId, 1000, 0, searchQuery);
      setRows(rowsData.rows);
    } catch (err) {
      console.error('Failed to load active table data', err);
    } finally {
      setLoading(false);
    }
  }, [activeTableId, searchQuery]);

  // 2b. Rows-only refresh. Called after row mutations (create/update/delete).
  const loadRowsOnly = useCallback(async () => {
    if (!activeTableId) return;
    try {
      const rowsData = await fetchRows(activeTableId, 1000, 0, searchQuery);
      setRows(rowsData.rows);
    } catch (err) {
      console.error('Failed to refresh rows', err);
    }
  }, [activeTableId, searchQuery]);

  useEffect(() => {
    loadActiveTableData();
  }, [loadActiveTableData]);

  // Check if working view config differs from saved DB activeView (isDirty)
  const isViewDirty = useMemo(() => {
    if (!activeView) return false;
    const filtersChanged =
      JSON.stringify(workingFilterConfig) !== JSON.stringify(activeView.filter_config || []);
    const sortsChanged =
      JSON.stringify(workingSortConfig) !== JSON.stringify(activeView.sort_config || []);
    const groupChanged = (workingGroupBy || null) !== (activeView.group_by_column_id || null);
    const typeChanged = workingType !== activeView.type;
    const cardPropsChanged =
      JSON.stringify(workingCardProperties) !== JSON.stringify(activeView.card_properties || []);
    return filtersChanged || sortsChanged || groupChanged || typeChanged || cardPropsChanged;
  }, [activeView, workingFilterConfig, workingSortConfig, workingGroupBy, workingType, workingCardProperties]);

  const [isSavingView, setIsSavingView] = useState(false);

  // Handle Save View Config (Manual Save)
  const handleSaveViewConfig = async () => {
    if (!activeView) return;
    setIsSavingView(true);
    try {
      const updated = await updateView(activeView.id, {
        filter_config: workingFilterConfig,
        sort_config: workingSortConfig,
        group_by_column_id: workingGroupBy,
        type: workingType,
        card_properties: workingCardProperties,
      });
      setActiveView(updated);
      setViews((prevViews) => prevViews.map((v) => (v.id === updated.id ? updated : v)));
      await loadNamespacesAndTables();
      if (activeTableId) {
        const freshViews = await fetchViews(activeTableId);
        setViews(freshViews);
      }
    } catch (err) {
      alert('Failed to save view configuration');
    } finally {
      setIsSavingView(false);
    }
  };

  // Handle Discard View Changes
  const handleDiscardViewChanges = () => {
    if (!activeView) return;
    setWorkingFilterConfig(activeView.filter_config || []);
    setWorkingSortConfig(activeView.sort_config || []);
    setWorkingGroupBy(activeView.group_by_column_id || null);
    setWorkingType(activeView.type || 'grid');
    setWorkingCardProperties(
      activeView.card_properties ?? (activeSchema ? ['content', ...activeSchema.columns.map((c) => c.name)] : [])
    );
  };

  // Apply Filter and Sort Rules Client-Side
  const processedRows = useMemo(() => {
    let result = [...rows];

    // Apply Filter Config
    if (workingFilterConfig.length > 0) {
      result = result.filter((r) => {
        return workingFilterConfig.every((rule) => {
          let itemVal: any;
          if (rule.property === 'title') itemVal = r.title;
          else if (rule.property === 'content') itemVal = r.content;
          else itemVal = r.properties ? r.properties[rule.property] : undefined;

          if (itemVal === undefined || itemVal === null) return false;

          const strItemVal = Array.isArray(itemVal) ? itemVal.join(', ') : String(itemVal).toLowerCase();
          const strTargetVal = String(rule.value || '').toLowerCase();

          if (rule.operator === 'equals') return strItemVal === strTargetVal;
          if (rule.operator === 'contains') return strItemVal.includes(strTargetVal);
          if (rule.operator === 'not_equals') return strItemVal !== strTargetVal;
          return true;
        });
      });
    }

    // Apply Sort Config
    if (workingSortConfig.length > 0) {
      result.sort((a, b) => {
        for (const s of workingSortConfig) {
          let valA = s.property === 'title' ? a.title : a.properties ? a.properties[s.property] : '';
          let valB = s.property === 'title' ? b.title : b.properties ? b.properties[s.property] : '';

          valA = valA !== undefined && valA !== null ? valA : '';
          valB = valB !== undefined && valB !== null ? valB : '';

          if (valA < valB) return s.direction === 'asc' ? -1 : 1;
          if (valA > valB) return s.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [rows, workingFilterConfig, workingSortConfig]);

  // View operations
  const handleSelectViewTab = (v: ViewSchema) => {
    setActiveView(v);
    setWorkingFilterConfig(v.filter_config || []);
    setWorkingSortConfig(v.sort_config || []);
    setWorkingGroupBy(v.group_by_column_id || null);
    setWorkingType(v.type || 'grid');
    setWorkingCardProperties(
      v.card_properties ?? (activeSchema ? ['content', ...activeSchema.columns.map((c) => c.name)] : [])
    );
  };

  const handleSelectView = (v: ViewSchema) => {
    if (v.table_id === activeTableId) {
      handleSelectViewTab(v);
    } else {
      targetViewIdRef.current = v.id;
      setActiveTableId(v.table_id);
    }
  };

  const handleCreateViewForTable = async (
    tableId: number,
    data: { name: string; emoji: string; type: 'grid' | 'kanban' }
  ) => {
    try {
      const newV = await createView(tableId, {
        ...data,
        filter_config: tableId === activeTableId ? workingFilterConfig : [],
        sort_config: tableId === activeTableId ? workingSortConfig : [],
        group_by_column_id: tableId === activeTableId ? workingGroupBy : null,
        card_properties:
          tableId === activeTableId
            ? workingCardProperties
            : activeSchema
            ? ['content', ...activeSchema.columns.map((c) => c.name)]
            : [],
      });
      await loadNamespacesAndTables();
      if (tableId === activeTableId) {
        const freshViews = await fetchViews(tableId);
        setViews(freshViews);
        handleSelectViewTab(newV);
      } else {
        handleSelectView(newV);
      }
    } catch (err) {
      alert('Failed to create view');
    }
  };

  const handleUpdateView = async (
    viewId: number,
    data: { name?: string; emoji?: string; type?: 'grid' | 'kanban' }
  ) => {
    setSaveStatus('saving');
    try {
      const updated = await updateView(viewId, data);
      setViews((prevViews) => prevViews.map((v) => (v.id === updated.id ? updated : v)));
      if (activeView?.id === updated.id) {
        setActiveView(updated);
        if (data.type) setWorkingType(data.type);
      }
      await loadNamespacesAndTables();
      if (activeTableId) {
        const freshViews = await fetchViews(activeTableId);
        setViews(freshViews);
      }
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      alert(err.message || 'Failed to update view');
    }
  };

  const handleDeleteView = async (viewId: number) => {
    if (!confirm('Are you sure you want to delete this view?')) return;
    try {
      await deleteView(viewId);
      await loadNamespacesAndTables();
      if (activeTableId) {
        const freshViews = await fetchViews(activeTableId);
        setViews(freshViews);
        if (activeView?.id === viewId) {
          if (freshViews.length > 0) {
            handleSelectViewTab(freshViews[0]);
          } else {
            setActiveView(null);
          }
        }
      }
    } catch (err) {
      alert('Failed to delete view');
    }
  };

  const handleReorderViews = async (tableId: number, viewIds: number[]) => {
    setSaveStatus('saving');
    try {
      const freshViews = await reorderViews(tableId, viewIds);
      await loadNamespacesAndTables();
      if (activeTableId === tableId) {
        setViews(freshViews);
        if (freshViews.length > 0) {
          const currentStillExists = freshViews.find((v) => v.id === activeView?.id);
          if (currentStillExists) {
            setActiveView(currentStillExists);
          } else {
            handleSelectViewTab(freshViews[0]);
          }
        }
      }
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      alert('Failed to reorder views');
    }
  };

  // Namespace operations
  const handleCreateNamespace = async (name: string, emoji = '📁') => {
    setSaveStatus('saving');
    try {
      await createNamespace(name, emoji);
      await loadNamespacesAndTables();
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      alert(err.message || 'Failed to create namespace');
    }
  };

  const handleUpdateNamespace = async (
    nsId: number,
    data: { name?: string; emoji?: string; is_collapsed?: boolean }
  ) => {
    if (data.is_collapsed !== undefined) {
      setNamespaces((prev) =>
        prev.map((ns) => (ns.id === nsId ? { ...ns, is_collapsed: data.is_collapsed! } : ns))
      );
    }
    setSaveStatus('saving');
    try {
      await updateNamespace(nsId, data);
      await loadNamespacesAndTables();
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      alert('Failed to update namespace');
    }
  };

  const handleToggleNamespaceCollapse = async (nsId: number, isCollapsed: boolean) => {
    await handleUpdateNamespace(nsId, { is_collapsed: isCollapsed });
  };

  const handleDeleteNamespace = async (nsId: number) => {
    const ns = namespaces.find((n) => n.id === nsId);
    if (!confirm(`Are you sure you want to delete namespace "${ns?.name || 'Namespace'}"?`)) return;
    setSaveStatus('saving');
    try {
      await deleteNamespace(nsId);
      await loadNamespacesAndTables();
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      alert(err.message || 'Failed to delete namespace');
    }
  };

  // Table operations
  const handleSelectTable = (id: number) => {
    setActiveTableId(id);
    setSelectedRowIds([]);
  };

  const handleCreateTable = async (name: string, emoji = '📁', namespaceId?: number | null) => {
    setSaveStatus('saving');
    try {
      const newSchema = await createTable(name, emoji, namespaceId);
      await loadNamespacesAndTables();
      setActiveTableId(newSchema.id);
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      alert(err.message || 'Failed to create table');
    }
  };

  const handleUpdateTable = async (
    tableId: number,
    data: { name?: string; emoji?: string; namespace_id?: number | null }
  ) => {
    setSaveStatus('saving');
    try {
      const updatedSchema = await updateTableConfig(tableId, data);
      await loadNamespacesAndTables();
      if (activeTableId === tableId) {
        setActiveSchema((prev) => (prev ? { ...prev, ...updatedSchema } : prev));
      }
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      alert('Failed to update table');
    }
  };

  const handleMoveTableToNamespace = async (tableId: number, targetNamespaceId: number) => {
    setSaveStatus('saving');
    try {
      await updateTableConfig(tableId, { namespace_id: targetNamespaceId });
      await loadNamespacesAndTables();
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      alert('Failed to move table to namespace');
    }
  };

  const handleUpdateTableEmoji = async (newEmoji: string) => {
    if (!activeTableId) return;
    await handleUpdateTable(activeTableId, { emoji: newEmoji });
  };

  const handleDeleteTable = async (id: number) => {
    setSaveStatus('saving');
    try {
      await deleteTable(id);
      await loadNamespacesAndTables();
      const remaining = tables.filter((t) => t.id !== id);
      if (activeTableId === id) {
        setActiveTableId(remaining.length > 0 ? remaining[0].id : null);
      }
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      alert('Failed to delete table');
    }
  };

  // Row operations
  const handleAddNewRow = async (seedProps?: Record<string, any>) => {
    if (!activeTableId) return;
    setSaveStatus('saving');

    const derivedSeed: Record<string, any> = seedProps ?? {};
    if (!seedProps) {
      workingFilterConfig.forEach((rule) => {
        if (rule.operator === 'equals' && rule.value !== undefined && rule.value !== '') {
          derivedSeed[rule.property] = rule.value;
        }
      });
    }

    try {
      const newRow = await createRow(activeTableId, {
        title: 'New Page',
        content: '',
        properties: derivedSeed,
      });
      await loadRowsOnly();
      await loadNamespacesAndTables();
      setSaveStatus('saved');

      setSelectedRowIds([newRow.id]);
      setAutoEditRowId(newRow.id);
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleUpdateCell = async (rowId: number, propertyName: string, newValue: any) => {
    if (!activeTableId) return;
    setSaveStatus('saving');

    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            properties: { ...r.properties, [propertyName]: newValue },
          };
        }
        return r;
      })
    );

    try {
      const targetRow = rows.find((r) => r.id === rowId);
      const currentProperties = targetRow?.properties || {};
      const updatedProps = { ...currentProperties, [propertyName]: newValue };

      await updateRow(activeTableId, rowId, { properties: updatedProps });
      await loadRowsOnly();
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleUpdateRowTitle = async (rowId: number, newTitle: string) => {
    if (!activeTableId) return;
    setSaveStatus('saving');

    setRows((prevRows) => prevRows.map((r) => (r.id === rowId ? { ...r, title: newTitle } : r)));

    try {
      await updateRow(activeTableId, rowId, { title: newTitle });
      await loadRowsOnly();
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleUpdateRow = async (
    rowId: number,
    data: { title?: string; emoji?: string; content?: string; properties?: Record<string, any> }
  ) => {
    if (!activeTableId) return;
    setSaveStatus('saving');

    try {
      const updated = await updateRow(activeTableId, rowId, data);
      setDetailRow(updated);
      await loadRowsOnly();
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleUpdateTitleAlias = async (newAlias: string) => {
    if (!activeTableId) return;
    setSaveStatus('saving');
    try {
      const updatedSchema = await updateTableConfig(activeTableId, { title_alias: newAlias });
      setActiveSchema(updatedSchema);
      setTables((prev) =>
        prev.map((t) => (t.id === activeTableId ? { ...t, title_alias: newAlias } : t))
      );
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleDeleteRow = async (rowId: number) => {
    if (!activeTableId) return;
    setSaveStatus('saving');
    try {
      await deleteRow(activeTableId, rowId);
      setSelectedRowIds(selectedRowIds.filter((id) => id !== rowId));
      await loadRowsOnly();
      await loadNamespacesAndTables();
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleDeleteSelectedRows = async () => {
    if (!activeTableId || selectedRowIds.length === 0) return;
    if (!confirm(`Delete ${selectedRowIds.length} selected rows permanently?`)) return;

    setSaveStatus('saving');
    try {
      for (const id of selectedRowIds) {
        await deleteRow(activeTableId, id);
      }
      setSelectedRowIds([]);
      await loadRowsOnly();
      await loadNamespacesAndTables();
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleBatchUpdateProperty = async (propertyName: string, newValue: any) => {
    if (!activeTableId || selectedRowIds.length === 0) return;
    setSaveStatus('saving');

    const updatePayload: Record<string, any> = {};
    if (propertyName === 'title') {
      updatePayload.title = newValue;
    } else {
      updatePayload.properties = { [propertyName]: newValue };
    }

    try {
      await batchUpdateRows(activeTableId, selectedRowIds, updatePayload);
      await loadRowsOnly();
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      alert('Failed to batch update property across selected rows');
    }
  };


  const handleAddPropertySubmit = async (colData: {
    name: string;
    type: PropertyType;
    options?: OptionWithDefault[] | string[];
    target_table_id?: number | null;
    relation_column_name?: string | null;
    target_property_name?: string | null;
  }) => {
    if (!activeTableId) return;
    setSaveStatus('saving');
    try {
      await addColumn(activeTableId, colData);
      setWorkingCardProperties((prev) => (prev.includes(colData.name) ? prev : [...prev, colData.name]));
      setShowAddProperty(false);
      await loadActiveTableData();
      await loadNamespacesAndTables();
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      alert(err.message || 'Failed to add property column');
    }
  };

  const handleUpdatePropertySubmit = async (colData: {
    name: string;
    options?: Array<{ value: string; isDefault: boolean }>;
    target_table_id?: number | null;
  }) => {
    if (!activeTableId || !editingColumn) return;
    setSaveStatus('saving');
    try {
      const oldName = editingColumn.name;
      const newName = colData.name;
      await updateColumn(activeTableId, editingColumn.id, colData);
      if (oldName && newName && oldName !== newName) {
        setWorkingCardProperties((prev) => prev.map((p) => (p === oldName ? newName : p)));
        setWorkingFilterConfig((prev) => prev.map((r) => (r.property === oldName ? { ...r, property: newName } : r)));
        setWorkingSortConfig((prev) => prev.map((r) => (r.property === oldName ? { ...r, property: newName } : r)));
      }
      setEditingColumn(null);
      await loadActiveTableData();
      await loadNamespacesAndTables();
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      alert(err.message || 'Failed to update property column');
    }
  };

  const handleDeletePropertyColumn = async () => {
    if (!activeTableId || !editingColumn) return;
    setSaveStatus('saving');
    try {
      const delName = editingColumn.name;
      await deleteColumn(activeTableId, editingColumn.id);
      setWorkingCardProperties((prev) => prev.filter((p) => p !== delName));
      setWorkingFilterConfig((prev) => prev.filter((r) => r.property !== delName));
      setWorkingSortConfig((prev) => prev.filter((r) => r.property !== delName));
      if (workingGroupBy === editingColumn.id) {
        setWorkingGroupBy(null);
      }
      setEditingColumn(null);
      await loadActiveTableData();
      await loadNamespacesAndTables();
      setSaveStatus('saved');
    } catch (err: any) {
      setSaveStatus('error');
      alert(err.message || 'Failed to delete property column');
    }
  };

  const handleToggleSelectRow = (id: number) => {
    if (selectedRowIds.includes(id)) {
      setSelectedRowIds(selectedRowIds.filter((rId) => rId !== id));
    } else {
      setSelectedRowIds([...selectedRowIds, id]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIds.length === processedRows.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(processedRows.map((r) => r.id));
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      <Sidebar
        namespaces={namespaces}
        tables={tables}
        activeTableId={activeTableId}
        activeViewId={activeView?.id || null}
        onSelectTable={handleSelectTable}
        onSelectView={handleSelectView}
        onCreateNamespace={handleCreateNamespace}
        onUpdateNamespace={handleUpdateNamespace}
        onDeleteNamespace={handleDeleteNamespace}
        onCreateTable={handleCreateTable}
        onUpdateTable={handleUpdateTable}
        onDeleteTable={handleDeleteTable}
        onCreateView={handleCreateViewForTable}
        onUpdateView={handleUpdateView}
        onDeleteView={handleDeleteView}
        onMoveTableToNamespace={handleMoveTableToNamespace}
        onReorderViews={handleReorderViews}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {activeSchema ? (
          <>
            <header className="p-4 border-b dark:border-zinc-800 border-slate-200 dark:bg-[#191919] bg-white flex items-center justify-between gap-4 shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                {/* Table Emoji — custom input + preset picker */}
                <EmojiHeaderPicker
                  emoji={activeSchema.emoji || '📁'}
                  onChange={handleUpdateTableEmoji}
                />

                <div>
                  <h2 className="text-base font-bold dark:text-slate-100 text-slate-900 flex items-center gap-2">
                    {activeSchema.name}
                  </h2>
                  <div className="flex items-center gap-3">
                    <p className="text-xs dark:text-slate-400 text-slate-500 font-mono">
                      {activeSchema.physical_table_name} • {activeSchema.columns.length + 5} Properties
                    </p>

                    {/* Auto-Save Status Badge */}
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      {saveStatus === 'saved' && (
                        <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Saved to DB
                        </span>
                      )}
                      {saveStatus === 'saving' && (
                        <span className="text-amber-300 flex items-center gap-1 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          <Loader2 className="w-3 h-3 text-amber-300 animate-spin" />
                          Saving...
                        </span>
                      )}
                      {saveStatus === 'error' && (
                        <span className="text-rose-400 flex items-center gap-1 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          Save Error
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* View Controls, Search & Theme Toggle */}
              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 dark:text-slate-500 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search rows or markdown..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full dark:bg-slate-950 bg-slate-50 dark:border-slate-800 border-slate-200 border rounded-lg pl-8 pr-3 py-1.5 text-xs dark:text-slate-200 text-slate-700 placeholder:dark:text-slate-500 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={() => loadActiveTableData()}
                  title="Refresh Table"
                  className="p-2 dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border dark:hover:bg-slate-800 hover:bg-slate-100 dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-700 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>

                {/* Theme Toggle */}
                <ThemeToggle theme={theme} onSetTheme={setTheme} />
              </div>
            </header>

            {/* View Tab Bar */}
            <ViewTabBar
              views={views}
              activeViewId={activeView?.id || null}
              onSelectView={handleSelectViewTab}
              onCreateView={(data) => activeTableId && handleCreateViewForTable(activeTableId, data)}
              onUpdateView={handleUpdateView}
              onDeleteView={handleDeleteView}
            />

            {/* Unsaved View Config Warning Banner */}
            {isViewDirty && (
              <div className="bg-amber-950/60 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Unsaved view configuration changes detected! Save or discard view settings.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDiscardViewChanges}
                    className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Discard Changes</span>
                  </button>
                  <button
                    onClick={handleSaveViewConfig}
                    disabled={isSavingView}
                    className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-3 py-1 rounded-md text-xs font-medium transition-all shadow active:scale-95"
                  >
                    {isSavingView ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    <span>{isSavingView ? 'Saving...' : 'Save View'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter, Sort, Card Properties & Grouping Toolbar */}
            <FilterSortToolbar
              schema={activeSchema}
              filterConfig={workingFilterConfig}
              sortConfig={workingSortConfig}
              groupByColumnId={workingGroupBy}
              cardProperties={workingCardProperties}
              viewType={workingType}
              selectedRowIds={selectedRowIds}
              onUpdateFilters={setWorkingFilterConfig}
              onUpdateSorts={setWorkingSortConfig}
              onUpdateGroupBy={setWorkingGroupBy}
              onUpdateCardProperties={setWorkingCardProperties}
              onBatchUpdateProperty={handleBatchUpdateProperty}
            />

            {/* View Canvas with Bouncy Zoom-Fade Entrance Animation */}
            <div
              key={activeView?.id || 'empty'}
              className="flex-1 flex flex-col min-w-0 h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            >
              {workingType === 'grid' ? (
                <DataGrid
                  schema={activeSchema}
                  rows={processedRows}
                  selectedRowIds={selectedRowIds}
                  groupByColumnId={workingGroupBy}
                  cardProperties={workingCardProperties}
                  onToggleSelectRow={handleToggleSelectRow}
                  onToggleSelectAll={handleToggleSelectAll}
                  onUpdateCell={handleUpdateCell}
                  onUpdateRowTitle={handleUpdateRowTitle}
                  onUpdateTitleAlias={handleUpdateTitleAlias}
                  onDeleteRow={handleDeleteRow}
                  onDeleteSelectedRows={handleDeleteSelectedRows}
                  onOpenRowDetail={(r) => setDetailRow(r)}
                  onAddNewRow={handleAddNewRow}
                  onOpenAddProperty={() => setShowAddProperty(true)}
                  onOpenEditProperty={(col) => setEditingColumn(col)}
                  onOpenExportModal={() => setShowExportModal(true)}
                  onBatchUpdateProperty={handleBatchUpdateProperty}
                  autoEditRowId={autoEditRowId}
                  onClearAutoEdit={() => setAutoEditRowId(null)}
                />

              ) : (
                <KanbanView
                  schema={activeSchema}
                  rows={processedRows}
                  groupByColumnId={workingGroupBy}
                  cardProperties={workingCardProperties}
                  onOpenRowDetail={(r) => setDetailRow(r)}
                  onUpdateCell={handleUpdateCell}
                  onUpdateRowTitle={handleUpdateRowTitle}
                  onAddNewRow={handleAddNewRow}
                  selectedRowIds={selectedRowIds}
                  onToggleSelectRow={handleToggleSelectRow}
                  autoEditRowId={autoEditRowId}
                  onClearAutoEdit={() => setAutoEditRowId(null)}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20">
              <Database className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">No Dynamic Table Selected</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              Select an existing table or view subpage from the sidebar or create a new table/namespace to start building Notion-style dynamic database rows and cross-table references.
            </p>
          </div>
        )}
      </main>

      {detailRow && activeSchema && (
        <RowDetailModal
          schema={activeSchema}
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onUpdateRow={handleUpdateRow}
          onDeleteRow={handleDeleteRow}
        />
      )}

      {showAddProperty && activeTableId && (
        <AddPropertyModal
          currentTableId={activeTableId}
          currentTableSchema={activeSchema}
          tables={tables}
          onClose={() => setShowAddProperty(false)}
          onSubmit={handleAddPropertySubmit}
        />
      )}

      {editingColumn && activeTableId && (
        <EditPropertyModal
          column={editingColumn}
          currentTableId={activeTableId}
          tables={tables}
          onClose={() => setEditingColumn(null)}
          onSubmit={handleUpdatePropertySubmit}
          onDelete={handleDeletePropertyColumn}
        />
      )}

      {showExportModal && activeSchema && (
        <ExportModal
          schema={activeSchema}
          rows={processedRows}
          selectedRowIds={selectedRowIds}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};
