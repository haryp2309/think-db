import React, { useState } from 'react';
import { Download, X, CheckSquare, Square, FileSpreadsheet, Sparkles } from 'lucide-react';
import { TableSchema, RowItem } from '../../types';
import { exportCsv } from '../../services/api';

interface ExportModalProps {
  schema: TableSchema;
  rows: RowItem[];
  selectedRowIds: number[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  schema,
  rows,
  selectedRowIds,
  onClose,
}) => {
  // All possible exportable columns: default columns + custom properties
  const defaultCols = ['id', 'title', 'content', 'created_at', 'updated_at'];
  const customCols = schema.columns.map((c) => c.name);
  const allAvailableCols = [...defaultCols, ...customCols];

  const [selectedCols, setSelectedCols] = useState<string[]>(allAvailableCols);
  const [exportOnlySelectedRows, setExportOnlySelectedRows] = useState<boolean>(
    selectedRowIds.length > 0
  );
  const [exporting, setExporting] = useState(false);

  const toggleColumn = (col: string) => {
    if (selectedCols.includes(col)) {
      setSelectedCols(selectedCols.filter((c) => c !== col));
    } else {
      setSelectedCols([...selectedCols, col]);
    }
  };

  const handleDownload = async () => {
    if (selectedCols.length === 0) return;
    setExporting(true);
    try {
      const rowIds = exportOnlySelectedRows && selectedRowIds.length > 0 ? selectedRowIds : undefined;
      const blob = await exportCsv(schema.id, selectedCols, rowIds);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${schema.name.toLowerCase().replace(/\s+/g, '_')}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error('Failed to download Polars CSV', err);
      alert('CSV Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700/80 shadow-2xl animate-in zoom-in-90 fade-in duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">High-Performance Polars CSV Export</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Row Filter Selection */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Row Selection</label>
            <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="rowsExport"
                  checked={!exportOnlySelectedRows}
                  onChange={() => setExportOnlySelectedRows(false)}
                  className="accent-blue-500"
                />
                <span>Export All Rows ({rows.length})</span>
              </label>

              {selectedRowIds.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rowsExport"
                    checked={exportOnlySelectedRows}
                    onChange={() => setExportOnlySelectedRows(true)}
                    className="accent-blue-500"
                  />
                  <span>Selected Rows Only ({selectedRowIds.length})</span>
                </label>
              )}
            </div>
          </div>

          {/* Columns Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Select Export Columns</label>
              <button
                type="button"
                onClick={() =>
                  setSelectedCols(selectedCols.length === allAvailableCols.length ? [] : allAvailableCols)
                }
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {selectedCols.length === allAvailableCols.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 rounded-lg p-2 space-y-1">
              {allAvailableCols.map((col) => {
                const isChecked = selectedCols.includes(col);
                return (
                  <div
                    key={col}
                    onClick={() => toggleColumn(col)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer text-xs text-slate-800 dark:text-slate-200"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
                    )}
                    <span className="font-mono">{col}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>CSV generation is streamed in memory directly via Polars.</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedCols.length === 0 || exporting}
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Generating...' : 'Download CSV'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
