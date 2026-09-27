package com.thinkdb.app.data.remote

import com.thinkdb.app.data.model.*
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Namespaces
    @GET("api/v1/namespaces")
    suspend fun getNamespaces(): NamespacesResponse

    @POST("api/v1/namespaces")
    suspend fun createNamespace(@Body request: CreateNamespaceRequest): Namespace

    @PATCH("api/v1/namespaces/{ns_id}")
    suspend fun updateNamespace(
        @Path("ns_id") nsId: Int,
        @Body request: UpdateNamespaceRequest
    ): Namespace

    @DELETE("api/v1/namespaces/{ns_id}")
    suspend fun deleteNamespace(@Path("ns_id") nsId: Int): ApiMessageResponse

    // Tables
    @GET("api/v1/tables")
    suspend fun getTables(): TablesResponse

    @POST("api/v1/tables")
    suspend fun createTable(@Body request: CreateTableRequest): TableSchema

    @GET("api/v1/tables/{table_id}")
    suspend fun getTableSchema(@Path("table_id") tableId: Int): TableSchema

    @PATCH("api/v1/tables/{table_id}")
    suspend fun updateTableConfig(
        @Path("table_id") tableId: Int,
        @Body request: UpdateTableConfigRequest
    ): TableSchema

    @DELETE("api/v1/tables/{table_id}")
    suspend fun deleteTable(@Path("table_id") tableId: Int): ApiMessageResponse

    // Columns
    @POST("api/v1/tables/{table_id}/columns")
    suspend fun addColumn(
        @Path("table_id") tableId: Int,
        @Body request: AddColumnRequest
    ): ColumnOperationResponse

    @PATCH("api/v1/tables/{table_id}/columns/{column_id}")
    suspend fun updateColumn(
        @Path("table_id") tableId: Int,
        @Path("column_id") columnId: Int,
        @Body request: UpdateColumnRequest
    ): ColumnOperationResponse

    @DELETE("api/v1/tables/{table_id}/columns/{column_id}")
    suspend fun deleteColumn(
        @Path("table_id") tableId: Int,
        @Path("column_id") columnId: Int
    ): ColumnOperationResponse

    // Views
    @GET("api/v1/tables/{table_id}/views")
    suspend fun getViews(@Path("table_id") tableId: Int): ViewsResponse

    @POST("api/v1/tables/{table_id}/views")
    suspend fun createView(
        @Path("table_id") tableId: Int,
        @Body request: CreateViewRequest
    ): ViewSchema

    @PATCH("api/v1/views/{view_id}")
    suspend fun updateView(
        @Path("view_id") viewId: Int,
        @Body request: UpdateViewRequest
    ): ViewSchema

    @POST("api/v1/tables/{table_id}/views/reorder")
    suspend fun reorderViews(
        @Path("table_id") tableId: Int,
        @Body request: ReorderViewsRequest
    ): ViewsResponse

    @DELETE("api/v1/views/{view_id}")
    suspend fun deleteView(@Path("view_id") viewId: Int): ApiMessageResponse

    // Rows
    @GET("api/v1/tables/{table_id}/rows")
    suspend fun getRows(
        @Path("table_id") tableId: Int,
        @Query("limit") limit: Int = 500,
        @Query("offset") offset: Int = 0,
        @Query("search") search: String? = null
    ): RowListResponse

    @POST("api/v1/tables/{table_id}/rows")
    suspend fun createRow(
        @Path("table_id") tableId: Int,
        @Body request: CreateRowRequest
    ): RowData

    @GET("api/v1/tables/{table_id}/rows/{row_id}")
    suspend fun getRow(
        @Path("table_id") tableId: Int,
        @Path("row_id") rowId: Int
    ): RowData

    @PATCH("api/v1/tables/{table_id}/rows/{row_id}")
    suspend fun updateRow(
        @Path("table_id") tableId: Int,
        @Path("row_id") rowId: Int,
        @Body request: UpdateRowRequest
    ): RowData

    @PATCH("api/v1/tables/{table_id}/rows/batch")
    suspend fun batchUpdateRows(
        @Path("table_id") tableId: Int,
        @Body request: BatchUpdateRowsRequest
    ): List<RowData>

    @DELETE("api/v1/tables/{table_id}/rows/{row_id}")
    suspend fun deleteRow(
        @Path("table_id") tableId: Int,
        @Path("row_id") rowId: Int
    ): ApiMessageResponse

    // Export CSV
    @POST("api/v1/export/csv")
    @Streaming
    suspend fun exportCsv(@Body request: ExportRequest): Response<ResponseBody>
}
