import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Sparkles,
  Clock,
  Lock,
  SlidersHorizontal,
  FileText,
  Tag,
  Hash,
  Link,
  Layers,
  Database,
  Type
} from 'lucide-react';
import { TableSchema, RowItem, ColumnMeta } from '../../types';
import { StringCell, EnumCell, TagsCell, ReferenceCell, AggregatedRelationCell, RollupCell } from '../grid/CellEditors';
import { TipTapEditor } from './TipTapEditor';

interface RowDetailModalProps {
  schema: TableSchema;
  row: RowItem;
  onClose: () => void;
  onUpdateRow: (rowId: number, data: { title?: string; emoji?: string; content?: string; properties?: Record<string, any> }) => void;
  onDeleteRow: (rowId: number) => void;
}

const EMOJI_PRESETS = ['📄', '🚀', '🐛', '📌', '💡', '🔥', '⚡', '🎯', '⚙️', '📝', '✨', '👤', '📁', '📊', '🏷️'];

function getColumnIcon(type: string, isInverse?: boolean) {
  if (isInverse || type === 'referenced') return <Link className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  if (type === 'reference') return <Link className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  if (type === 'rollup') return <Layers className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
  if (type === 'tags') return <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  if (type === 'enum') return <Hash className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
  return <Type className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

export const RowDetailModal: React.FC<RowDetailModalProps> = ({
  schema,
  row,
  onClose,
  onUpdateRow,
  onDeleteRow,
}) => {
  const [title, setTitle] = useState(row.title || '');
  const [emoji, setEmoji] = useState(row.emoji || '');
  const [content, setContent] = useState(row.content || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const contentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 160);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClosing]);

  useEffect(() => {
    setTitle(row.title || '');
    setEmoji(row.emoji || '');
    setContent(row.content || '');
  }, [row]);

  // Outside click for emoji picker
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current);
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    };
  }, []);

  // Title Auto-save (1 second debounced delay)
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      onUpdateRow(row.id, { title: newTitle });
    }, 1000);
  };

  // Emoji Auto-save
  const handleEmojiChange = (newEmoji: string) => {
    setEmoji(newEmoji);
    onUpdateRow(row.id, { emoji: newEmoji });
    setShowEmojiPicker(false);
  };

  // Debounced Markdown content auto-save (1 second delay)
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current);
    contentTimeoutRef.current = setTimeout(() => {
      onUpdateRow(row.id, { content: newContent });
    }, 1000);
  };

  const handlePropertyChange = (propName: string, newValue: any) => {
    const nextProps = { ...row.properties, [propName]: newValue };
    onUpdateRow(row.id, { properties: nextProps });
  };

  const columns = schema.columns || [];
  const titleLabel = schema.title_alias || 'Title';

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 dark:bg-black/75 flex items-center justify-center p-3 sm:p-6 ${
        isClosing ? 'animate-backdrop-fade-out' : 'animate-backdrop-fade'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`w-full max-w-6xl h-[88vh] bg-white dark:bg-[#191919] border border-slate-200 dark:border-zinc-800/90 rounded-xl flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-zinc-100 relative ${
          isClosing ? 'animate-modal-pop-out' : 'animate-modal-pop'
        }`}
      >
        {/* Notion Style Header Toolbar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/60 dark:bg-[#202020] shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-sans">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 font-medium">
              <span>{schema.emoji || '📁'}</span>
              <span>{schema.name}</span>
            </span>
            <span className="text-slate-300 dark:text-zinc-600">/</span>
            <span className="text-slate-900 dark:text-zinc-200 font-semibold flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              Row #{row.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-sans flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Saved
            </span>

            <div className="w-px h-4 bg-slate-200 dark:bg-zinc-800 mx-1" />

            <button
              onClick={() => {
                if (confirm('Delete this row permanently?')) {
                  onDeleteRow(row.id);
                  handleClose();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              title="Delete row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Main Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Main Left Content Area (70% width) */}
          <div className="flex-1 flex flex-col min-w-0 p-6 overflow-y-auto space-y-6">
            {/* Title & Emoji Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 relative">
                {/* Row Emoji Picker */}
                <div ref={emojiPickerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-xl transition-colors shrink-0"
                    title="Change row emoji"
                  >
                    {emoji || <span className="text-sm text-slate-400 font-sans">😀</span>}
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl p-3 animate-modal-pop text-slate-800 dark:text-zinc-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-1.5">
                        <span className="text-xs font-semibold">Row Icon Emoji</span>
                        {emoji && (
                          <button
                            type="button"
                            onClick={() => handleEmojiChange('')}
                            className="text-[10px] text-red-500 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Custom Input */}
                      <input
                        type="text"
                        placeholder="Type custom emoji..."
                        value={emoji}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const seg = new Intl.Segmenter().segment(raw);
                          const first = [...seg][0]?.segment ?? '';
                          handleEmojiChange(first);
                        }}
                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-center"
                      />

                      {/* Presets */}
                      <div className="grid grid-cols-5 gap-1.5">
                        {EMOJI_PRESETS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => handleEmojiChange(e)}
                            className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                              emoji === e
                                ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-xs'
                                : 'hover:bg-slate-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Large Title Input */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={`Untitled ${titleLabel}`}
                  className="flex-1 bg-transparent text-3xl font-bold text-slate-900 dark:text-zinc-100 placeholder:text-slate-300 dark:placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-slate-300 dark:focus:border-zinc-700 pb-1 transition-colors"
                />
              </div>
            </div>

            {/* TipTap Markdown Editor Canvas */}
            <div className="flex-1 flex flex-col min-h-[350px]">
              <TipTapEditor
                content={content}
                onChange={handleContentChange}
                placeholder="Write rich formatted markdown notes, docs, task specifications..."
              />
            </div>
          </div>

          {/* Right Sidebar Properties Inspector (30% width / Notion style) */}
          <div className="w-80 shrink-0 border-l border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#141414] p-5 flex flex-col justify-between overflow-y-auto font-sans">
            <div className="space-y-4">
              {/* Inspector Title */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                  Properties Inspector
                </h4>
                <span className="text-[10px] font-mono bg-slate-200/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-zinc-400">
                  {columns.length}
                </span>
              </div>

              {/* Property Items List */}
              {columns.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed border-slate-300 dark:border-zinc-800">
                  <p className="text-xs text-slate-400 dark:text-zinc-500 italic">No custom properties configured for this table</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {columns.map((col) => {
                    const val = row.properties ? row.properties[col.name] : undefined;

                    return (
                      <div
                        key={col.id}
                        className="group space-y-1 bg-white dark:bg-[#1d1d1d] p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                      >
                        {/* Property Header Label */}
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {getColumnIcon(col.type, col.is_inverse)}
                            <span className="truncate font-medium text-slate-700 dark:text-zinc-300">
                              {col.name}
                            </span>
                          </div>

                          {col.is_inverse && (
                            <span
                              className="text-[9px] uppercase font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 shrink-0 border border-amber-200 dark:border-amber-900/50"
                              title="Read-only inverse relation"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              Ref
                            </span>
                          )}
                          {col.type === 'rollup' && (
                            <span
                              className="text-[9px] uppercase font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded font-semibold shrink-0 border border-purple-200 dark:border-purple-900/50"
                              title="Calculated rollup"
                            >
                              Rollup
                            </span>
                          )}
                        </div>

                        {/* Property Cell Value Editor */}
                        <div className="pt-1">
                          {col.is_inverse ? (
                            <AggregatedRelationCell column={col} row={row} />
                          ) : (
                            <>
                              {col.type === 'string' && (
                                <StringCell
                                  column={col}
                                  value={val}
                                  onChange={(nv) => handlePropertyChange(col.name, nv)}
                                />
                              )}
                              {col.type === 'enum' && (
                                <EnumCell
                                  column={col}
                                  value={val}
                                  onChange={(nv) => handlePropertyChange(col.name, nv)}
                                />
                              )}
                              {col.type === 'tags' && (
                                <TagsCell
                                  column={col}
                                  value={val}
                                  onChange={(nv) => handlePropertyChange(col.name, nv)}
                                />
                              )}
                              {col.type === 'reference' && (
                                <ReferenceCell
                                  column={col}
                                  value={val}
                                  onChange={(nv) => handlePropertyChange(col.name, nv)}
                                />
                              )}
                              {col.type === 'rollup' && (
                                <RollupCell column={col} row={row} />
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

            {/* Footer Metadata Info */}
            <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 text-[11px] text-slate-400 dark:text-zinc-500 space-y-1 font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Updated</span>
                </span>
                <span>{row.updated_at ? new Date(row.updated_at).toLocaleTimeString() : 'Just now'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  <span>Physical ID</span>
                </span>
                <span>#{row.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
