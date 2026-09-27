package com.thinkdb.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class Namespace(
    val id: Int,
    val name: String,
    val emoji: String = "📁",
    @SerialName("is_collapsed") val isCollapsed: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    val tables: List<TableSummary> = emptyList()
)

@Serializable
data class CreateNamespaceRequest(
    val name: String,
    val emoji: String? = "📁"
)

@Serializable
data class UpdateNamespaceRequest(
    val name: String? = null,
    val emoji: String? = null,
    @SerialName("is_collapsed") val isCollapsed: Boolean? = null
)

@Serializable
data class TableSummary(
    val id: Int,
    val name: String,
    val emoji: String = "📁",
    @SerialName("title_alias") val titleAlias: String = "Title",
    @SerialName("physical_table_name") val physicalTableName: String? = null,
    @SerialName("namespace_id") val namespaceId: Int? = null,
    @SerialName("kanban_group_column_id") val kanbanGroupColumnId: Int? = null,
    @SerialName("kanban_group_column_name") val kanbanGroupColumnName: String? = null,
    @SerialName("row_count") val rowCount: Int = 0,
    @SerialName("column_count") val columnCount: Int = 0,
    val views: List<ViewSchema> = emptyList(),
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class ColumnSchema(
    val id: Int,
    @SerialName("table_id") val tableId: Int? = null,
    val name: String,
    @SerialName("physical_column_name") val physicalColumnName: String? = null,
    val type: String, // 'string', 'enum', 'tags', 'reference', 'rollup', 'referenced'
    val options: JsonElement? = null,
    @SerialName("options_with_defaults") val optionsWithDefaults: JsonElement? = null,
    @SerialName("default_value") val defaultValue: String? = null,
    @SerialName("target_table_id") val targetTableId: Int? = null,
    @SerialName("target_table_name") val targetTableName: String? = null,
    @SerialName("relation_column_name") val relationColumnName: String? = null,
    @SerialName("target_property_name") val targetPropertyName: String? = null,
    @SerialName("is_inverse") val isInverse: Boolean = false,
    @SerialName("is_readonly") val isReadonly: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class TableSchema(
    val id: Int,
    val name: String,
    val emoji: String = "📁",
    @SerialName("title_alias") val titleAlias: String = "Title",
    @SerialName("physical_table_name") val physicalTableName: String? = null,
    @SerialName("namespace_id") val namespaceId: Int? = null,
    @SerialName("kanban_group_column_id") val kanbanGroupColumnId: Int? = null,
    @SerialName("kanban_group_column_name") val kanbanGroupColumnName: String? = null,
    val columns: List<ColumnSchema> = emptyList(),
    val views: List<ViewSchema> = emptyList(),
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class CreateTableRequest(
    val name: String,
    val emoji: String? = "📁",
    @SerialName("title_alias") val titleAlias: String? = "Title",
    @SerialName("namespace_id") val namespaceId: Int? = null
)

@Serializable
data class UpdateTableConfigRequest(
    val name: String? = null,
    val emoji: String? = null,
    @SerialName("title_alias") val titleAlias: String? = null,
    @SerialName("kanban_group_column_id") val kanbanGroupColumnId: Int? = null,
    @SerialName("namespace_id") val namespaceId: Int? = null
)

@Serializable
data class AddColumnRequest(
    val name: String,
    val type: String,
    val options: List<JsonElement>? = emptyList(),
    @SerialName("target_table_id") val targetTableId: Int? = null,
    @SerialName("relation_column_name") val relationColumnName: String? = null,
    @SerialName("target_property_name") val targetPropertyName: String? = null
)

@Serializable
data class UpdateColumnRequest(
    val name: String? = null,
    val options: List<JsonElement>? = null,
    @SerialName("target_table_id") val targetTableId: Int? = null
)

@Serializable
data class ColumnOperationResponse(
    @SerialName("added_column") val addedColumn: ColumnSchema? = null,
    @SerialName("updated_column") val updatedColumn: ColumnSchema? = null,
    @SerialName("table_schema") val tableSchema: TableSchema? = null,
    val message: String? = null
)

@Serializable
data class FilterRule(
    val property: String? = null,
    @SerialName("column_name") val columnName: String? = null,
    @SerialName("column_id") val columnId: Int? = null,
    val operator: String = "equals",
    val value: JsonElement? = null
) {
    val targetProperty: String
        get() = property ?: columnName ?: ""
}

@Serializable
data class SortRule(
    val property: String? = null,
    @SerialName("column_name") val columnName: String? = null,
    @SerialName("column_id") val columnId: Int? = null,
    val direction: String = "asc"
) {
    val targetProperty: String
        get() = property ?: columnName ?: ""
}

@Serializable
data class ViewSchema(
    val id: Int,
    @SerialName("table_id") val tableId: Int,
    val name: String,
    val emoji: String = "📋",
    val type: String = "grid",
    @SerialName("filter_config") val filterConfig: List<FilterRule> = emptyList(),
    @SerialName("sort_config") val sortConfig: List<SortRule> = emptyList(),
    @SerialName("group_by_column_id") val groupByColumnId: Int? = null,
    @SerialName("group_by_column_name") val groupByColumnName: String? = null,
    @SerialName("visible_columns") val visibleColumns: List<String> = emptyList(),
    @SerialName("card_properties") val cardProperties: List<String> = emptyList(),
    @SerialName("is_default") val isDefault: Boolean = false,
    val position: Int = 0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class CreateViewRequest(
    val name: String,
    val emoji: String = "📋",
    val type: String = "grid",
    @SerialName("filter_config") val filterConfig: List<FilterRule> = emptyList(),
    @SerialName("sort_config") val sortConfig: List<SortRule> = emptyList(),
    @SerialName("group_by_column_id") val groupByColumnId: Int? = null,
    @SerialName("visible_columns") val visibleColumns: List<String> = emptyList(),
    @SerialName("card_properties") val cardProperties: List<String>? = emptyList(),
    @SerialName("is_default") val isDefault: Boolean = false
)

@Serializable
data class UpdateViewRequest(
    val name: String? = null,
    val emoji: String? = null,
    val type: String? = null,
    @SerialName("filter_config") val filterConfig: List<FilterRule>? = null,
    @SerialName("sort_config") val sortConfig: List<SortRule>? = null,
    @SerialName("group_by_column_id") val groupByColumnId: Int? = null,
    @SerialName("visible_columns") val visibleColumns: List<String>? = null,
    @SerialName("card_properties") val cardProperties: List<String>? = null,
    @SerialName("is_default") val isDefault: Boolean? = null
)

@Serializable
data class ReorderViewsRequest(
    @SerialName("view_ids") val viewIds: List<Int>
)

@Serializable
data class RowData(
    val id: Int,
    val title: String = "",
    val content: String = "",
    val emoji: String? = "",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    val properties: Map<String, JsonElement> = emptyMap()
)

@Serializable
data class RowListResponse(
    @SerialName("table_id") val tableId: Int? = null,
    @SerialName("table_name") val tableName: String? = null,
    val rows: List<RowData> = emptyList(),
    val total: Int = 0,
    val limit: Int = 100,
    val offset: Int = 0
)

@Serializable
data class CreateRowRequest(
    val title: String = "",
    val content: String = "",
    val emoji: String? = "",
    val properties: Map<String, JsonElement> = emptyMap()
)

@Serializable
data class UpdateRowRequest(
    val title: String? = null,
    val content: String? = null,
    val emoji: String? = null,
    val properties: Map<String, JsonElement>? = null
)

@Serializable
data class BatchUpdateRowsRequest(
    @SerialName("row_ids") val rowIds: List<Int>,
    val title: String? = null,
    val content: String? = null,
    val emoji: String? = null,
    val properties: Map<String, JsonElement>? = null
)

@Serializable
data class ExportRequest(
    @SerialName("table_id") val tableId: Int,
    @SerialName("selected_columns") val selectedColumns: List<String>,
    @SerialName("selected_row_ids") val selectedRowIds: List<Int>? = null
)

@Serializable
data class ApiMessageResponse(
    val message: String
)

@Serializable
data class NamespacesResponse(
    val namespaces: List<Namespace>
)

@Serializable
data class TablesResponse(
    val tables: List<TableSummary>
)

@Serializable
data class ViewsResponse(
    val views: List<ViewSchema>
)
