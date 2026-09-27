import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ViewSchema } from '../../types';
import { Plus, Table2, Kanban, Trash2, X, Sparkles, Pencil } from 'lucide-react';
import { EditViewModal } from './EditViewModal';

interface ViewTabBarProps {
  views: ViewSchema[];
  activeViewId: number | null;
  onSelectView: (view: ViewSchema) => void;
  onCreateView: (data: { name: string; emoji: string; type: 'grid' | 'kanban' }) => void;
  onUpdateView: (viewId: number, data: { name?: string; emoji?: string; type?: 'grid' | 'kanban' }) => void;
  onDeleteView: (viewId: number) => void;
}

const EMOJI_PRESETS = ['📋', '🚀', '⚡', '🐞', '📌', '🎯', '📊', '👥', '📁', '📑', '🌟', '⚙️'];

const EmojiPicker: React.FC<{ value: string; onChange: (e: string) => void }> = ({ value, onChange }) => (
  <div className="space-y-2">
    <label className="block text-xs font-medium dark:text-slate-400 text-slate-600 mb-1">
      Icon — type any emoji or pick a preset
    </label>
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 flex-shrink-0 rounded-xl dark:bg-slate-800 bg-slate-100 border dark:border-slate-700 border-slate-300 flex items-center justify-center text-xl">
        {value || '📋'}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const seg = new Intl.Segmenter().segment(raw);
          const first = [...seg][0]?.segment ?? '';
          if (first) onChange(first);
        }}
        placeholder="Type emoji…"
        className="w-24 dark:bg-slate-950 bg-white border dark:border-slate-700 border-slate-300 rounded-lg px-2.5 py-2 text-base text-center focus:outline-none focus:border-blue-500"
      />
    </div>
    <div className="flex flex-wrap gap-1.5">
      {EMOJI_PRESETS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
            value === e
              ? 'bg-blue-600 scale-110 shadow-lg ring-1 ring-blue-400 text-white'
              : 'dark:hover:bg-slate-800 hover:bg-slate-100 hover:scale-105'
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  </div>
);

// ── Create-View Modal (portalled to document.body) ──────────────────────────
interface CreateViewModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; emoji: string; type: 'grid' | 'kanban' }) => void;
}

const CreateViewModal: React.FC<CreateViewModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📋');
  const [type, setType] = useState<'grid' | 'kanban'>('grid');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), emoji, type });
    onClose();
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
        className="w-full max-w-sm rounded-2xl border dark:border-slate-700/80 border-slate-200 shadow-2xl dark:bg-slate-900 bg-white animate-in zoom-in-90 fade-in duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b dark:border-slate-800 border-slate-200">
          <h3 className="text-sm font-semibold dark:text-slate-100 text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Create New View
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="dark:text-slate-400 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium dark:text-slate-400 text-slate-600 mb-1.5">
              View Name
            </label>
            <input
              type="text"
              placeholder="e.g. All Items, High Priority, Board…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2.5 text-sm dark:text-slate-100 text-slate-900 placeholder:dark:text-slate-500 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
            />
          </div>

          {/* Emoji */}
          <EmojiPicker value={emoji} onChange={setEmoji} />

          {/* Layout Type */}
          <div>
            <label className="block text-xs font-medium dark:text-slate-400 text-slate-600 mb-1.5">
              Layout
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('grid')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-left ${
                  type === 'grid'
                    ? 'bg-blue-900/30 border-blue-500/70 text-blue-300'
                    : 'dark:bg-slate-900/60 bg-slate-50 dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500 dark:hover:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <Table2 className={`w-5 h-5 flex-shrink-0 ${type === 'grid' ? 'text-blue-400' : 'dark:text-slate-500 text-slate-400'}`} />
                <div>
                  <div className="text-xs font-semibold">Table</div>
                  <div className="text-[10px] opacity-70 mt-0.5">Grid layout</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType('kanban')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-left ${
                  type === 'kanban'
                    ? 'bg-purple-900/30 border-purple-500/70 text-purple-300'
                    : 'dark:bg-slate-900/60 bg-slate-50 dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500 dark:hover:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <Kanban className={`w-5 h-5 flex-shrink-0 ${type === 'kanban' ? 'text-purple-400' : 'dark:text-slate-500 text-slate-400'}`} />
                <div>
                  <div className="text-xs font-semibold">Kanban</div>
                  <div className="text-[10px] opacity-70 mt-0.5">Board layout</div>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border dark:border-slate-700 border-slate-300 text-xs dark:text-slate-300 text-slate-600 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors shadow-lg shadow-blue-600/25"
            >
              Create View
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ── View Tab Bar ─────────────────────────────────────────────────────────────
export const ViewTabBar: React.FC<ViewTabBarProps> = ({
  views,
  activeViewId,
  onSelectView,
  onCreateView,
  onUpdateView,
  onDeleteView,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingView, setEditingView] = useState<ViewSchema | null>(null);

  return (
    <>
      <div className="flex items-center dark:border-zinc-800 border-slate-200 border-b dark:bg-[#191919] bg-white shrink-0 select-none">
        {/* Scrollable tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 px-3 py-1.5 min-w-0 scrollbar-none">
          {views.map((v) => {
            const isActive = v.id === activeViewId;
            const Icon = v.type === 'kanban' ? Kanban : Table2;

            return (
              <div
                key={v.id}
                onClick={() => onSelectView(v)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-500 border border-blue-500/40 shadow-sm dark:text-blue-300'
                    : 'dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-800 dark:hover:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm leading-none">{v.emoji || '📋'}</span>
                <span>{v.name}</span>
                <Icon className="w-3 h-3 dark:text-slate-500 text-slate-400 group-hover:text-slate-300 ml-0.5 flex-shrink-0" />

                {/* Edit View Button */}
                <button
                  type="button"
                  title="Edit view settings"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingView(v);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 dark:text-slate-500 text-slate-400 hover:text-blue-400 rounded dark:hover:bg-slate-700 hover:bg-slate-200 transition-all ml-1"
                >
                  <Pencil className="w-3 h-3" />
                </button>

                {/* Delete View Button */}
                {views.length > 1 && (
                  <button
                    type="button"
                    title="Delete view"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteView(v.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 dark:text-slate-500 text-slate-400 hover:text-red-400 rounded dark:hover:bg-slate-700 hover:bg-slate-200 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add View — fixed to the right */}
        <div className="flex-shrink-0 pl-2 pr-3 py-1.5 border-l dark:border-slate-800/60 border-slate-200">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            title="Add a new view"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-blue-300 hover:text-blue-600 dark:hover:bg-blue-600/10 hover:bg-blue-50 border border-transparent dark:hover:border-blue-500/30 hover:border-blue-300/50 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add View</span>
          </button>
        </div>
      </div>

      {showCreateModal && (
        <CreateViewModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={onCreateView}
        />
      )}

      {editingView && (
        <EditViewModal
          view={editingView}
          onClose={() => setEditingView(null)}
          onSubmit={(data) => onUpdateView(editingView.id, data)}
          onDelete={(vId) => onDeleteView(vId)}
          canDelete={views.length > 1}
        />
      )}
    </>
  );
};
