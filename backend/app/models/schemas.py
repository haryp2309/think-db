from typing import NotRequired, TypeAlias, TypedDict

# Primitive DB parameter / column value types
ScalarValue: TypeAlias = str | int | float | bool | None

class ColumnOptionItem(TypedDict):
    value: str
    isDefault: bool

class RollupOptionConfig(TypedDict, total=False):
    relation_column_name: str | None
    target_property_name: str | None

ColumnOptionInput: TypeAlias = str | ColumnOptionItem | RollupOptionConfig

class ReferenceLinkItem(TypedDict):
    id: int
    emoji: str
    title: str
    table_name: str

PropertyValue: TypeAlias = (
    ScalarValue
    | list[str]
    | ReferenceLinkItem
    | list[ReferenceLinkItem]
    | dict[str, ScalarValue]
)

class FilterRuleDict(TypedDict, total=False):
    column: str
    property: str
    operator: str
    value: ScalarValue | list[str]

class SortRuleDict(TypedDict, total=False):
    column: str
    direction: str

class ColumnSchemaDict(TypedDict):
    id: int
    table_id: int
    name: str
    physical_column_name: str
    type: str
    options: list[str]
    options_with_defaults: list[ColumnOptionItem]
    default_value: str | None
    target_table_id: int | None
    target_table_name: str | None
    relation_column_name: str | None
    target_property_name: str | None
    is_inverse: bool
    is_readonly: NotRequired[bool]
    source_column_id: NotRequired[int | None]

class ViewSchemaDict(TypedDict):
    id: int
    table_id: NotRequired[int]
    name: str
    emoji: str
    type: str
    filter_config: NotRequired[list[FilterRuleDict]]
    sort_config: NotRequired[list[SortRuleDict]]
    group_by_column_id: NotRequired[int | None]
    group_by_column_name: NotRequired[str | None]
    visible_columns: NotRequired[list[str]]
    card_properties: NotRequired[list[str]]
    is_default: NotRequired[bool]
    position: NotRequired[int]
    created_at: NotRequired[str | None]
    updated_at: NotRequired[str | None]

class TableSummaryDict(TypedDict):
    id: int
    name: str
    emoji: str
    title_alias: str
    physical_table_name: str
    namespace_id: int
    kanban_group_column_id: int | None
    kanban_group_column_name: str | None
    created_at: str | None
    updated_at: str | None
    row_count: int
    column_count: int
    views: NotRequired[list[ViewSchemaDict]]

class TableSchemaDict(TypedDict):
    id: int
    name: str
    emoji: str
    title_alias: str
    physical_table_name: str
    kanban_group_column_id: int | None
    kanban_group_column_name: str | None
    created_at: str | None
    updated_at: str | None
    columns: list[ColumnSchemaDict]

class NamespaceSchemaDict(TypedDict):
    id: int
    name: str
    emoji: str
    is_collapsed: bool
    created_at: NotRequired[str | None]
    updated_at: NotRequired[str | None]
    tables: NotRequired[list[TableSummaryDict]]

class RowDict(TypedDict):
    id: int | None
    emoji: NotRequired[str]
    title: NotRequired[str]
    content: NotRequired[str]
    created_at: NotRequired[str | None]
    updated_at: NotRequired[str | None]
    properties: dict[str, PropertyValue]
    _raw: NotRequired[dict[str, ScalarValue]]

class RowsResponseDict(TypedDict):
    table_id: int
    table_name: str
    total: int
    limit: int
    offset: int
    rows: list[RowDict]

# --- Mutation Data Dictionaries ---

class UpdateNamespaceDict(TypedDict):
    name: NotRequired[str]
    emoji: NotRequired[str]
    is_collapsed: NotRequired[bool]

class UpdateTableConfigDict(TypedDict):
    name: NotRequired[str]
    emoji: NotRequired[str]
    title_alias: NotRequired[str]
    kanban_group_column_id: NotRequired[int | None]
    namespace_id: NotRequired[int | None]

class CreateViewDict(TypedDict):
    name: NotRequired[str]
    emoji: NotRequired[str]
    type: NotRequired[str]
    filter_config: NotRequired[list[FilterRuleDict]]
    sort_config: NotRequired[list[SortRuleDict]]
    group_by_column_id: NotRequired[int | None]
    visible_columns: NotRequired[list[str]]
    card_properties: NotRequired[list[str]]
    is_default: NotRequired[bool]
    position: NotRequired[int]

class UpdateViewConfigDict(TypedDict):
    name: NotRequired[str]
    emoji: NotRequired[str]
    type: NotRequired[str]
    filter_config: NotRequired[list[FilterRuleDict]]
    sort_config: NotRequired[list[SortRuleDict]]
    group_by_column_id: NotRequired[int | None]
    visible_columns: NotRequired[list[str]]
    card_properties: NotRequired[list[str]]
    position: NotRequired[int]
    is_default: NotRequired[bool]

class CreateRowDict(TypedDict):
    emoji: NotRequired[str]
    title: NotRequired[str]
    content: NotRequired[str]
    properties: NotRequired[dict[str, PropertyValue]]

class UpdateRowDict(TypedDict):
    emoji: NotRequired[str | None]
    title: NotRequired[str | None]
    content: NotRequired[str | None]
    properties: NotRequired[dict[str, PropertyValue] | None]
