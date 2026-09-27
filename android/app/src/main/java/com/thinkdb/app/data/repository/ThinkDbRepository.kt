package com.thinkdb.app.data.repository

import com.thinkdb.app.data.model.*
import com.thinkdb.app.data.remote.ApiClient
import okhttp3.ResponseBody
import retrofit2.Response

class ThinkDbRepository {
    private val api get() = ApiClient.getService()

    fun updateBaseUrl(newUrl: String) {
        ApiClient.getService(newUrl)
    }

    suspend fun getNamespaces(): Result<List<Namespace>> = runCatching {
        api.getNamespaces().namespaces
    }

    suspend fun createNamespace(name: String, emoji: String?): Result<Namespace> = runCatching {
        api.createNamespace(CreateNamespaceRequest(name, emoji))
    }

    suspend fun updateNamespace(id: Int, name: String?, emoji: String?, isCollapsed: Boolean?): Result<Namespace> = runCatching {
        api.updateNamespace(id, UpdateNamespaceRequest(name, emoji, isCollapsed))
    }

    suspend fun deleteNamespace(id: Int): Result<String> = runCatching {
        api.deleteNamespace(id).message
    }

    suspend fun getTables(): Result<List<TableSummary>> = runCatching {
        api.getTables().tables
    }

    suspend fun createTable(name: String, emoji: String?, titleAlias: String?): Result<TableSchema> = runCatching {
        api.createTable(CreateTableRequest(name, emoji, titleAlias))
    }

    suspend fun getTableSchema(tableId: Int): Result<TableSchema> = runCatching {
        api.getTableSchema(tableId)
    }

    suspend fun updateTableConfig(
        tableId: Int,
        name: String? = null,
        emoji: String? = null,
        titleAlias: String? = null,
        kanbanGroupColumnId: Int? = null,
        namespaceId: Int? = null
    ): Result<TableSchema> = runCatching {
        api.updateTableConfig(
            tableId,
            UpdateTableConfigRequest(name, emoji, titleAlias, kanbanGroupColumnId, namespaceId)
        )
    }

    suspend fun deleteTable(tableId: Int): Result<String> = runCatching {
        api.deleteTable(tableId).message
    }

    suspend fun addColumn(tableId: Int, request: AddColumnRequest): Result<ColumnOperationResponse> = runCatching {
        api.addColumn(tableId, request)
    }

    suspend fun updateColumn(tableId: Int, columnId: Int, request: UpdateColumnRequest): Result<ColumnOperationResponse> = runCatching {
        api.updateColumn(tableId, columnId, request)
    }

    suspend fun deleteColumn(tableId: Int, columnId: Int): Result<ColumnOperationResponse> = runCatching {
        api.deleteColumn(tableId, columnId)
    }

    suspend fun getViews(tableId: Int): Result<List<ViewSchema>> = runCatching {
        api.getViews(tableId).views
    }

    suspend fun createView(tableId: Int, request: CreateViewRequest): Result<ViewSchema> = runCatching {
        api.createView(tableId, request)
    }

    suspend fun updateView(viewId: Int, request: UpdateViewRequest): Result<ViewSchema> = runCatching {
        api.updateView(viewId, request)
    }

    suspend fun reorderViews(tableId: Int, viewIds: List<Int>): Result<List<ViewSchema>> = runCatching {
        api.reorderViews(tableId, ReorderViewsRequest(viewIds)).views
    }

    suspend fun deleteView(viewId: Int): Result<String> = runCatching {
        api.deleteView(viewId).message
    }

    suspend fun getRows(tableId: Int, search: String? = null): Result<RowListResponse> = runCatching {
        api.getRows(tableId, search = search)
    }

    suspend fun createRow(tableId: Int, request: CreateRowRequest): Result<RowData> = runCatching {
        api.createRow(tableId, request)
    }

    suspend fun getRow(tableId: Int, rowId: Int): Result<RowData> = runCatching {
        api.getRow(tableId, rowId)
    }

    suspend fun updateRow(tableId: Int, rowId: Int, request: UpdateRowRequest): Result<RowData> = runCatching {
        api.updateRow(tableId, rowId, request)
    }

    suspend fun batchUpdateRows(tableId: Int, request: BatchUpdateRowsRequest): Result<List<RowData>> = runCatching {
        api.batchUpdateRows(tableId, request)
    }

    suspend fun deleteRow(tableId: Int, rowId: Int): Result<String> = runCatching {
        api.deleteRow(tableId, rowId).message
    }

    suspend fun exportCsv(request: ExportRequest): Result<Response<ResponseBody>> = runCatching {
        api.exportCsv(request)
    }
}
