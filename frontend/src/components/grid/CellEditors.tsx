import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Tag, Link2, Check, Calculator } from 'lucide-react';
import { ColumnMeta, ReferenceValue, RowItem, TableSchema } from '../../types';
import { fetchRows } from '../../services/api';

// Curated modern color badge helper with high light mode contrast
const ENUM_COLORS = [
  'bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-500/30',
  'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
  'bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
  'bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-500/30',
  'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-500/30',
  'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30',
];

function getColorForValue(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ENUM_COLORS.length;
  return ENUM_COLORS[index];
}

interface CellProps {
  column: ColumnMeta;
  value: any;
  onChange: (newValue: any) => void;
}

export const StringCell: React.FC<CellProps> = ({ value, onChange }) => {
  const [val, setVal] = useState(value || '');

  useEffect(() => {
    setVal(value || '');
  }, [value]);

  return (
    <input
      type="text"
      value={val}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        if (val !== (value || '')) {
          onChange(val);
        }
      }}
      placeholder="Empty..."
      className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800/60 px-2 py-1 rounded transition-colors"
    />
  );
};

export const EnumCell: React.FC<CellProps> = ({ column, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [portalCoords, setPortalCoords] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < 220 && rect.top > 220;
      const left = Math.max(10, Math.min(rect.left, window.innerWidth - 190));
      setPortalCoords({
        position: 'fixed',
        top: showAbove ? `${rect.top - 4}px` : `${rect.bottom + 4}px`,
        left: `${left}px`,
        minWidth: `${Math.max(rect.width, 176)}px`,
        transform: showAbove ? 'translateY(-100%)' : 'none',
        zIndex: 9999,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const options = column.options || [];
  const currentVal = value ? String(value) : '';

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center justify-between gap-1 px-2 py-1 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
      >
        {currentVal ? (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getColorForValue(currentVal)}`}>
            {currentVal}
          </span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-600 italic">Select enum...</span>
        )}
        <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
      </div>

      {open &&
        ReactDOM.createPortal(
          <div
            ref={portalRef}
            style={portalCoords}
            onClick={(e) => e.stopPropagation()}
            className="w-44 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 animate-modal-pop text-slate-800 dark:text-zinc-200"
          >
            <div
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              Clear selection
            </div>
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getColorForValue(opt)}`}>
                  {opt}
                </span>
                {currentVal === opt && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export const TagsCell: React.FC<CellProps> = ({ column, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [portalCoords, setPortalCoords] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const currentTags: string[] = Array.isArray(value) ? value : [];

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < 220 && rect.top > 220;
      const left = Math.max(10, Math.min(rect.left, window.innerWidth - 210));
      setPortalCoords({
        position: 'fixed',
        top: showAbove ? `${rect.top - 4}px` : `${rect.bottom + 4}px`,
        left: `${left}px`,
        minWidth: `${Math.max(rect.width, 192)}px`,
        transform: showAbove ? 'translateY(-100%)' : 'none',
        zIndex: 9999,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const availableOptions = column.options || [];

  const toggleTag = (tag: string) => {
    let nextTags: string[];
    if (currentTags.includes(tag)) {
      nextTags = currentTags.filter((t) => t !== tag);
    } else {
      nextTags = [...currentTags, tag];
    }
    onChange(nextTags);
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center flex-wrap gap-1 px-1.5 py-1 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 min-h-[28px] transition-colors"
      >
        {currentTags.length > 0 ? (
          currentTags.map((t) => (
            <span
              key={t}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${getColorForValue(t)}`}
            >
              <Tag className="w-2.5 h-2.5 opacity-70" />
              {t}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-600 italic">Select tags...</span>
        )}
      </div>

      {open &&
        ReactDOM.createPortal(
          <div
            ref={portalRef}
            style={portalCoords}
            onClick={(e) => e.stopPropagation()}
            className="w-48 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl p-2 animate-modal-pop space-y-1 text-slate-800 dark:text-zinc-200 max-h-60 overflow-y-auto"
          >
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase px-1 pb-1">
              Toggle Tags
            </div>
            {availableOptions.map((opt) => {
              const isSelected = currentTags.includes(opt);
              return (
                <div
                  key={opt}
                  onClick={() => toggleTag(opt)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getColorForValue(opt)}`}>
                    {opt}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export const ReferenceCell: React.FC<CellProps> = ({ column, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [targetRows, setTargetRows] = useState<{ id: number; emoji?: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [portalCoords, setPortalCoords] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const refVal: ReferenceValue | null = typeof value === 'object' && value ? value : null;

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < 250 && rect.top > 250;
      const left = Math.max(10, Math.min(rect.left, window.innerWidth - 260));
      setPortalCoords({
        position: 'fixed',
        top: showAbove ? `${rect.top - 4}px` : `${rect.bottom + 4}px`,
        left: `${left}px`,
        minWidth: `${Math.max(rect.width, 240)}px`,
        transform: showAbove ? 'translateY(-100%)' : 'none',
        zIndex: 9999,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpenDropdown = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && column.target_table_id) {
      updateCoords();
      setLoading(true);
      try {
        const res = await fetchRows(column.target_table_id, 100, 0);
        setTargetRows(
          res.rows.map((r) => ({
            id: r.id,
            emoji: r.emoji || '',
            title: r.title || `Row #${r.id}`,
          }))
        );
      } catch (err) {
        console.error('Failed to fetch target rows for reference cell', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div
        onClick={handleOpenDropdown}
        className="flex items-center justify-between gap-1 px-2 py-1 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group"
      >
        {refVal ? (
          <span className="px-2 py-0.5 rounded-md bg-blue-100/80 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 truncate max-w-[170px]">
            {refVal.emoji ? (
              <span className="text-xs leading-none shrink-0">{refVal.emoji}</span>
            ) : (
              <Link2 className="w-3 h-3 text-blue-700 dark:text-blue-400 shrink-0" />
            )}
            <span className="truncate">{refVal.title}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-600 italic">Select link...</span>
        )}
        <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 shrink-0" />
      </div>

      {open &&
        ReactDOM.createPortal(
          <div
            ref={portalRef}
            style={portalCoords}
            onClick={(e) => e.stopPropagation()}
            className="w-60 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl p-1 animate-modal-pop max-h-60 overflow-y-auto text-slate-800 dark:text-zinc-200"
          >
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase px-2 py-1 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 mb-1">
              <span>Link to {column.target_table_name || 'Target Table'}</span>
            </div>

            <div
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer rounded"
            >
              Unlink reference
            </div>

            {loading ? (
              <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">Loading target rows...</div>
            ) : targetRows.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">No rows in target table</div>
            ) : (
              targetRows.map((r) => {
                const isSelected = refVal?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      onChange({ id: r.id, emoji: r.emoji, title: r.title });
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                      {r.emoji && <span className="text-xs leading-none shrink-0">{r.emoji}</span>}
                      <span className="truncate">{r.title}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />}
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export const RollupCell: React.FC<{
  column: ColumnMeta;
  row: RowItem;
}> = ({ column, row }) => {
  const [rolledUpVal, setRolledUpVal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const relVal = row.properties ? row.properties[column.relation_column_name || ''] : undefined;

  useEffect(() => {
    let isMounted = true;
    if (relVal && column.target_table_id && column.target_property_name) {
      const targetRowIds: number[] = Array.isArray(relVal)
        ? relVal.map((item: any) => (typeof item === 'object' ? item.id : item)).filter(Boolean)
        : typeof relVal === 'object' && relVal
        ? [relVal.id]
        : relVal
        ? [relVal]
        : [];

      if (targetRowIds.length > 0) {
        setLoading(true);
        fetchRows(column.target_table_id, 1000, 0)
          .then((res) => {
            if (!isMounted) return;
            const targetRows = res.rows.filter((r) => targetRowIds.includes(r.id));
            if (targetRows.length > 0) {
              const vals = targetRows
                .map((tr) => {
                  if (column.target_property_name === 'title') return tr.title;
                  if (column.target_property_name === 'content') return tr.content;
                  return tr.properties ? tr.properties[column.target_property_name || ''] : undefined;
                })
                .filter((v) => v !== undefined && v !== null && v !== '');
              setRolledUpVal(vals.length === 1 ? vals[0] : vals);
            } else {
              setRolledUpVal(null);
            }
          })
          .catch(() => {
            if (isMounted) setRolledUpVal(null);
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      } else {
        setRolledUpVal(null);
      }
    } else {
      setRolledUpVal(null);
    }
    return () => {
      isMounted = false;
    };
  }, [relVal, column.target_table_id, column.target_property_name]);

  if (!relVal || (Array.isArray(relVal) && relVal.length === 0)) {
    return <span className="text-xs text-slate-400 dark:text-slate-600 italic">No relation</span>;
  }

  if (loading) {
    return <span className="text-xs text-slate-400 animate-pulse font-mono">Rolling up...</span>;
  }

  if (rolledUpVal === undefined || rolledUpVal === null || rolledUpVal === '' || (Array.isArray(rolledUpVal) && rolledUpVal.length === 0)) {
    return <span className="text-xs text-slate-400 dark:text-slate-600 italic">Empty</span>;
  }

  const renderVal = () => {
    if (Array.isArray(rolledUpVal)) {
      return (
        <div className="flex items-center gap-1 flex-wrap">
          {rolledUpVal.map((v, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-300 text-[11px] font-semibold">
              {typeof v === 'object' ? v.title || JSON.stringify(v) : String(v)}
            </span>
          ))}
        </div>
      );
    }
    if (typeof rolledUpVal === 'object') {
      return (
        <span className="truncate">
          {rolledUpVal.title || JSON.stringify(rolledUpVal)}
        </span>
      );
    }
    return <span className="truncate">{String(rolledUpVal)}</span>;
  };

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 text-xs font-semibold max-w-full">
      <Calculator className="w-3 h-3 text-purple-500 shrink-0" />
      {renderVal()}
    </div>
  );
};

export const AggregatedRelationCell: React.FC<{
  column: ColumnMeta;
  row: RowItem;
}> = ({ column, row }) => {
  const propVal = row.properties ? row.properties[column.name] : undefined;
  const directList: { id: number; emoji?: string; title: string; table_name?: string }[] | null = Array.isArray(propVal) ? propVal : null;

  const [linkingRows, setLinkingRows] = useState<{ id: number; emoji?: string; title: string; table_name?: string }[]>(directList || []);
  const [loading, setLoading] = useState(directList === null);

  useEffect(() => {
    if (directList !== null) {
      setLinkingRows(directList);
      setLoading(false);
      return;
    }
    let isMounted = true;
    if (column.target_table_id) {
      setLoading(true);
      fetchRows(column.target_table_id, 1000, 0)
        .then((res) => {
          if (!isMounted) return;
          const matches = res.rows.filter((r) => {
            if (!r.properties) return false;
            return Object.values(r.properties).some((pVal: any) => {
              if (pVal === null || pVal === undefined) return false;
              if (typeof pVal === 'object') {
                if (Array.isArray(pVal)) {
                  return pVal.some((item) => (typeof item === 'object' ? item?.id === row.id : Number(item) === row.id));
                }
                return pVal.id === row.id;
              }
              return Number(pVal) === row.id;
            });
          });
          setLinkingRows(matches.map((r) => ({ id: r.id, emoji: r.emoji ?? undefined, title: r.title || `Row #${r.id}`, table_name: column.target_table_name || undefined })));
        })
        .catch(() => {
          if (isMounted) setLinkingRows([]);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [column.target_table_id, row.id, directList]);

  if (loading) {
    return <span className="text-xs text-slate-400 animate-pulse font-mono">Aggregating...</span>;
  }

  if (linkingRows.length === 0) {
    return <span className="text-xs text-slate-400 dark:text-slate-600 italic">No linked rows</span>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap py-0.5">
      {linkingRows.map((lr) => (
        <span
          key={lr.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-[11px] font-semibold"
          title={`Referenced by ${lr.table_name || column.target_table_name || 'table'} '${lr.title}' (Read-Only)`}
        >
          {lr.emoji ? (
            <span className="text-xs leading-none">{lr.emoji}</span>
          ) : (
            <Link2 className="w-3 h-3 text-amber-500 shrink-0" />
          )}
          <span className="truncate max-w-[120px]">{lr.title}</span>
        </span>
      ))}
    </div>
  );
};
