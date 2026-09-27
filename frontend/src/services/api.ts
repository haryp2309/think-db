import { TableSummary, TableSchema, RowsResponse, RowItem, ViewSchema, NamespaceSchema } from '../types';

const API_BASE = '/api/v1';

export async function fetchNamespaces(): Promise<NamespaceSchema[]> {
  const res = await fetch(`${API_BASE}/namespaces`);
  if (!res.ok) throw new Error('Failed to fetch namespaces');
  const data = await res.json();
  return data.namespaces;
}

export async function createNamespace(name: string, emoji = '📁'): Promise<NamespaceSchema> {
  const res = await fetch(`${API_BASE}/namespaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, emoji }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create namespace' }));
    throw new Error(err.detail || 'Failed to create namespace');
  }
  return res.json();
}

export async function updateNamespace(
  id: number,
  data: { name?: string; emoji?: string; is_collapsed?: boolean }
): Promise<NamespaceSchema> {
  const res = await fetch(`${API_BASE}/namespaces/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update namespace' }));
    throw new Error(err.detail || 'Failed to update namespace');
  }
  return res.json();
}

export async function deleteNamespace(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/namespaces/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete namespace');
}

export async function fetchTables(): Promise<TableSummary[]> {
  const res = await fetch(`${API_BASE}/tables`);
  if (!res.ok) throw new Error('Failed to fetch tables');
  const data = await res.json();
  return data.tables;
}

export async function createTable(name: string, emoji = '📁', namespaceId?: number | null): Promise<TableSchema> {
  const res = await fetch(`${API_BASE}/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, emoji, namespace_id: namespaceId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create table' }));
    throw new Error(err.detail || 'Failed to create table');
  }
  return res.json();
}

export async function fetchTableSchema(tableId: number): Promise<TableSchema> {
  const res = await fetch(`${API_BASE}/tables/${tableId}`);
  if (!res.ok) throw new Error('Failed to fetch table schema');
  return res.json();
}

export async function updateTableConfig(
  tableId: number,
  data: { name?: string; emoji?: string; title_alias?: string; kanban_group_column_id?: number | null; namespace_id?: number | null }
): Promise<TableSchema> {
  const res = await fetch(`${API_BASE}/tables/${tableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update table configuration' }));
    throw new Error(err.detail || 'Failed to update table configuration');
  }
  return res.json();
}

export async function deleteTable(tableId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/tables/${tableId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete table');
}

// --- VIEWS API ---

export async function fetchViews(tableId: number): Promise<ViewSchema[]> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/views`);
  if (!res.ok) throw new Error('Failed to fetch views');
  const data = await res.json();
  return data.views;
}

export async function createView(tableId: number, viewData: Partial<ViewSchema>): Promise<ViewSchema> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/views`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(viewData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create view' }));
    throw new Error(err.detail || 'Failed to create view');
  }
  return res.json();
}

export async function updateView(viewId: number, viewData: Partial<ViewSchema>): Promise<ViewSchema> {
  const res = await fetch(`${API_BASE}/views/${viewId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(viewData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update view' }));
    throw new Error(err.detail || 'Failed to update view');
  }
  return res.json();
}

export async function deleteView(viewId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/views/${viewId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete view');
}

export async function reorderViews(tableId: number, viewIds: number[]): Promise<ViewSchema[]> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/views/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ view_ids: viewIds }),
  });
  if (!res.ok) throw new Error('Failed to reorder views');
  const data = await res.json();
  return data.views;
}

// --- COLUMNS & ROWS API ---

export async function addColumn(
  tableId: number,
  colData: {
    name: string;
    type: string;
    options?: Array<{ value: string; isDefault: boolean }> | string[];
    target_table_id?: number | null;
    relation_column_name?: string | null;
    target_property_name?: string | null;
  }
): Promise<{ added_column: any; table_schema: any }> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(colData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add column' }));
    throw new Error(err.detail || 'Failed to add column');
  }
  return res.json();
}

export async function updateColumn(
  tableId: number,
  columnId: number,
  colData: {
    name?: string;
    options?: Array<{ value: string; isDefault: boolean }> | string[];
    target_table_id?: number | null;
  }
): Promise<{ updated_column: any; table_schema: any }> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/columns/${columnId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(colData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update column' }));
    throw new Error(err.detail || 'Failed to update column');
  }
  return res.json();
}

export async function deleteColumn(tableId: number, columnId: number): Promise<{ message: string; table_schema: any }> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/columns/${columnId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete column' }));
    throw new Error(err.detail || 'Failed to delete column');
  }
  return res.json();
}


export async function fetchRows(
  tableId: number,
  limit = 100,
  offset = 0,
  search?: string
): Promise<RowsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  const res = await fetch(`${API_BASE}/tables/${tableId}/rows?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch table rows');
  return res.json();
}

export async function createRow(
  tableId: number,
  rowData: { emoji?: string; title: string; content?: string; properties?: Record<string, any> }
): Promise<RowItem> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/rows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rowData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create row' }));
    throw new Error(err.detail || 'Failed to create row');
  }
  return res.json();
}

export async function updateRow(
  tableId: number,
  rowId: number,
  rowData: { emoji?: string; title?: string; content?: string; properties?: Record<string, any> }
): Promise<RowItem> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/rows/${rowId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rowData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update row' }));
    throw new Error(err.detail || 'Failed to update row');
  }
  return res.json();
}

export async function batchUpdateRows(
  tableId: number,
  rowIds: number[],
  rowData: { emoji?: string; title?: string; content?: string; properties?: Record<string, any> }
): Promise<RowItem[]> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/rows/batch`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row_ids: rowIds, ...rowData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to batch update rows' }));
    throw new Error(err.detail || 'Failed to batch update rows');
  }
  return res.json();
}


export async function deleteRow(tableId: number, rowId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/tables/${tableId}/rows/${rowId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete row');
}

export async function exportCsv(
  tableId: number,
  selectedColumns: string[],
  selectedRowIds?: number[]
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/export/csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table_id: tableId,
      selected_columns: selectedColumns,
      selected_row_ids: selectedRowIds && selectedRowIds.length > 0 ? selectedRowIds : null,
    }),
  });
  if (!res.ok) throw new Error('CSV export failed');
  return res.blob();
}
