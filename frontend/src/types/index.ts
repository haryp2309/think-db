export type PropertyType = 'string' | 'enum' | 'tags' | 'reference' | 'rollup' | 'referenced';

export interface OptionWithDefault {
  value: string;
  isDefault: boolean;
}

export interface ColumnMeta {
  id: number;
  table_id: number;
  name: string;
  physical_column_name: string;
  type: PropertyType;
  options: string[];                          // plain string[] for backwards-compat rendering
  options_with_defaults: OptionWithDefault[]; // enriched shape with isDefault flag
  default_value?: string | null;              // first option that has isDefault=true
  target_table_id?: number | null;
  target_table_name?: string | null;
  relation_column_name?: string | null;
  target_property_name?: string | null;
  is_inverse?: boolean;
  is_readonly?: boolean;
}

export interface NamespaceSchema {
  id: number;
  name: string;
  emoji: string;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
  tables: TableSummary[];
}

export interface TableSchema {
  id: number;
  name: string;
  emoji: string;
  title_alias?: string;
  physical_table_name: string;
  namespace_id?: number | null;
  kanban_group_column_id?: number | null;
  kanban_group_column_name?: string | null;
  created_at: string;
  updated_at: string;
  columns: ColumnMeta[];
  views?: ViewSchema[];
}

export interface TableSummary {
  id: number;
  name: string;
  emoji: string;
  title_alias?: string;
  physical_table_name: string;
  namespace_id?: number | null;
  kanban_group_column_id?: number | null;
  kanban_group_column_name?: string | null;
  created_at: string;
  updated_at: string;
  row_count: number;
  column_count: number;
  views?: ViewSchema[];
}

export interface FilterRule {
  property: string;
  operator: 'equals' | 'contains' | 'not_equals';
  value: any;
}

export interface SortRule {
  property: string;
  direction: 'asc' | 'desc';
}

export interface ViewSchema {
  id: number;
  table_id: number;
  name: string;
  emoji: string;
  type: 'grid' | 'kanban';
  filter_config: FilterRule[];
  sort_config: SortRule[];
  group_by_column_id?: number | null;
  group_by_column_name?: string | null;
  visible_columns: string[];
  card_properties?: string[];
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReferenceValue {
  id: number;
  emoji?: string | null;
  title: string;
}

export interface RowItem {
  id: number;
  emoji?: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  properties: Record<string, any>;
}

export interface RowsResponse {
  table_id: number;
  table_name: string;
  total: number;
  limit: number;
  offset: number;
  rows: RowItem[];
}
