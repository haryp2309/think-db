package com.thinkdb.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.thinkdb.app.data.model.*
import com.thinkdb.app.data.repository.ThinkDbRepository
import com.thinkdb.app.ui.theme.AppThemeMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ThinkDbRepository()

    private val _themeMode = MutableStateFlow(AppThemeMode.SYSTEM)
    val themeMode: StateFlow<AppThemeMode> = _themeMode.asStateFlow()

    private val _baseUrl = MutableStateFlow("http://10.0.2.2:8000/")
    val baseUrl: StateFlow<String> = _baseUrl.asStateFlow()

    private val _namespaces = MutableStateFlow<List<Namespace>>(emptyList())
    val namespaces: StateFlow<List<Namespace>> = _namespaces.asStateFlow()

    private val _tables = MutableStateFlow<List<TableSummary>>(emptyList())
    val tables: StateFlow<List<TableSummary>> = _tables.asStateFlow()

    private val _viewsMap = MutableStateFlow<Map<Int, List<ViewSchema>>>(emptyMap())
    val viewsMap: StateFlow<Map<Int, List<ViewSchema>>> = _viewsMap.asStateFlow()

    private val _selectedTableId = MutableStateFlow<Int?>(null)
    val selectedTableId: StateFlow<Int?> = _selectedTableId.asStateFlow()

    private val _selectedViewId = MutableStateFlow<Int?>(null)
    val selectedViewId: StateFlow<Int?> = _selectedViewId.asStateFlow()

    private val _currentTableSchema = MutableStateFlow<TableSchema?>(null)
    val currentTableSchema: StateFlow<TableSchema?> = _currentTableSchema.asStateFlow()

    private val _savedViewConfig = MutableStateFlow<ViewSchema?>(null)
    val savedViewConfig: StateFlow<ViewSchema?> = _savedViewConfig.asStateFlow()

    private val _workingViewConfig = MutableStateFlow<ViewSchema?>(null)
    val workingViewConfig: StateFlow<ViewSchema?> = _workingViewConfig.asStateFlow()

    private val _rows = MutableStateFlow<List<RowData>>(emptyList())
    val rows: StateFlow<List<RowData>> = _rows.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedRowIds = MutableStateFlow<Set<Int>>(emptySet())
    val selectedRowIds: StateFlow<Set<Int>> = _selectedRowIds.asStateFlow()

    private val _activeInspectorRow = MutableStateFlow<RowData?>(null)
    val activeInspectorRow: StateFlow<RowData?> = _activeInspectorRow.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _csvDownloadSuccessMessage = MutableStateFlow<String?>(null)
    val csvDownloadSuccessMessage: StateFlow<String?> = _csvDownloadSuccessMessage.asStateFlow()

    val hasUnsavedViewChanges: Boolean
        get() {
            val saved = _savedViewConfig.value ?: return false
            val working = _workingViewConfig.value ?: return false
            return saved.filterConfig != working.filterConfig ||
                    saved.sortConfig != working.sortConfig ||
                    saved.groupByColumnId != working.groupByColumnId ||
                    saved.visibleColumns != working.visibleColumns ||
                    saved.cardProperties != working.cardProperties ||
                    saved.type != working.type
        }

    init {
        loadWorkspace()
    }

    fun setThemeMode(mode: AppThemeMode) {
        _themeMode.value = mode
    }

    fun setBaseUrl(newUrl: String) {
        _baseUrl.value = newUrl
        repository.updateBaseUrl(newUrl)
        loadWorkspace()
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun clearCsvSuccess() {
        _csvDownloadSuccessMessage.value = null
    }

    fun loadWorkspace() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            repository.getNamespaces().fold(
                onSuccess = { _namespaces.value = it },
                onFailure = { _errorMessage.value = "Failed to load namespaces: ${it.localizedMessage}" }
            )

            repository.getTables().fold(
                onSuccess = { tableList ->
                    _tables.value = tableList
                    if (_selectedTableId.value == null && tableList.isNotEmpty()) {
                        selectTable(tableList.first().id)
                    }
                    val vMap = mutableMapOf<Int, List<ViewSchema>>()
                    tableList.forEach { tbl ->
                        repository.getViews(tbl.id).onSuccess { views ->
                            vMap[tbl.id] = views
                        }
                    }
                    _viewsMap.value = vMap
                },
                onFailure = { _errorMessage.value = "Failed to load tables: ${it.localizedMessage}" }
            )

            _isLoading.value = false
        }
    }

    fun selectTable(tableId: Int) {
        viewModelScope.launch {
            _selectedTableId.value = tableId
            _selectedRowIds.value = emptySet()

            repository.getTableSchema(tableId).fold(
                onSuccess = { schema ->
                    _currentTableSchema.value = schema
                    repository.getViews(tableId).onSuccess { viewsList ->
                        val map = _viewsMap.value.toMutableMap()
                        map[tableId] = viewsList
                        _viewsMap.value = map

                        val defaultView = viewsList.firstOrNull { it.isDefault } ?: viewsList.firstOrNull()
                        if (defaultView != null) {
                            selectView(tableId, defaultView.id)
                        }
                    }
                },
                onFailure = { _errorMessage.value = "Failed to load table schema: ${it.localizedMessage}" }
            )
        }
    }

    fun selectView(tableId: Int, viewId: Int) {
        viewModelScope.launch {
            _selectedTableId.value = tableId
            _selectedViewId.value = viewId
            _selectedRowIds.value = emptySet()

            val viewsList = _viewsMap.value[tableId] ?: emptyList()
            var targetView = viewsList.find { it.id == viewId } ?: viewsList.firstOrNull()

            val schema = _currentTableSchema.value
            if (targetView?.type == "kanban" && targetView.groupByColumnId == null && schema != null) {
                val candidateCol = schema.columns.find { it.type == "enum" || it.type == "tags" }
                if (candidateCol != null) {
                    targetView = targetView.copy(groupByColumnId = candidateCol.id)
                }
            }

            _savedViewConfig.value = targetView
            _workingViewConfig.value = targetView

            fetchRows(tableId, _searchQuery.value)
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
        val tblId = _selectedTableId.value ?: return
        fetchRows(tblId, query)
    }

    private fun fetchRows(tableId: Int, search: String?) {
        viewModelScope.launch {
            repository.getRows(tableId, search = search.takeIf { !it.isNullOrBlank() }).fold(
                onSuccess = { res ->
                    _rows.value = res.rows
                },
                onFailure = { _errorMessage.value = "Failed to load rows: ${it.localizedMessage}" }
            )
        }
    }

    fun updateWorkingView(updatedView: ViewSchema) {
        var next = updatedView
        val schema = _currentTableSchema.value
        if (next.type == "kanban" && next.groupByColumnId == null && schema != null) {
            val candidate = schema.columns.find { it.type == "enum" || it.type == "tags" }
            if (candidate != null) {
                next = next.copy(groupByColumnId = candidate.id)
            }
        }
        _workingViewConfig.value = next
    }

    fun saveViewChanges() {
        val working = _workingViewConfig.value ?: return
        viewModelScope.launch {
            repository.updateView(
                working.id,
                UpdateViewRequest(
                    type = working.type,
                    filterConfig = working.filterConfig,
                    sortConfig = working.sortConfig,
                    groupByColumnId = working.groupByColumnId,
                    visibleColumns = working.visibleColumns,
                    cardProperties = working.cardProperties
                )
            ).fold(
                onSuccess = { savedView ->
                    _savedViewConfig.value = savedView
                    _workingViewConfig.value = savedView
                    val tblId = working.tableId
                    repository.getViews(tblId).onSuccess { views ->
                        val map = _viewsMap.value.toMutableMap()
                        map[tblId] = views
                        _viewsMap.value = map
                    }
                },
                onFailure = { _errorMessage.value = "Failed to save view config: ${it.localizedMessage}" }
            )
        }
    }

    fun discardViewChanges() {
        _workingViewConfig.value = _savedViewConfig.value
    }

    fun toggleNamespaceCollapse(nsId: Int, isCollapsed: Boolean) {
        viewModelScope.launch {
            repository.updateNamespace(nsId, null, null, isCollapsed).onSuccess { updated ->
                _namespaces.value = _namespaces.value.map { if (it.id == nsId) updated else it }
            }
        }
    }

    fun createNamespace(name: String, emoji: String) {
        viewModelScope.launch {
            repository.createNamespace(name, emoji).fold(
                onSuccess = { loadWorkspace() },
                onFailure = { _errorMessage.value = "Failed to create namespace: ${it.localizedMessage}" }
            )
        }
    }

    fun updateNamespace(nsId: Int, name: String, emoji: String) {
        viewModelScope.launch {
            repository.updateNamespace(nsId, name, emoji, null).fold(
                onSuccess = { loadWorkspace() },
                onFailure = { _errorMessage.value = "Failed to update namespace: ${it.localizedMessage}" }
            )
        }
    }

    fun deleteNamespace(nsId: Int) {
        viewModelScope.launch {
            repository.deleteNamespace(nsId).fold(
                onSuccess = { loadWorkspace() },
                onFailure = { _errorMessage.value = "Failed to delete namespace: ${it.localizedMessage}" }
            )
        }
    }

    fun createTable(namespaceId: Int, name: String, emoji: String) {
        viewModelScope.launch {
            repository.createTable(name, emoji, "Title").fold(
                onSuccess = { schema ->
                    repository.updateTableConfig(schema.id, namespaceId = namespaceId).onSuccess {
                        loadWorkspace()
                        selectTable(schema.id)
                    }
                },
                onFailure = { _errorMessage.value = "Failed to create table: ${it.localizedMessage}" }
            )
        }
    }

    fun updateTable(tableId: Int, name: String, emoji: String, namespaceId: Int?) {
        viewModelScope.launch {
            repository.updateTableConfig(tableId, name = name, emoji = emoji, namespaceId = namespaceId).fold(
                onSuccess = { loadWorkspace() },
                onFailure = { _errorMessage.value = "Failed to update table: ${it.localizedMessage}" }
            )
        }
    }

    fun deleteTable(tableId: Int) {
        viewModelScope.launch {
            repository.deleteTable(tableId).fold(
                onSuccess = {
                    _selectedTableId.value = null
                    loadWorkspace()
                },
                onFailure = { _errorMessage.value = "Failed to delete table: ${it.localizedMessage}" }
            )
        }
    }

    fun createView(tableId: Int, name: String, emoji: String, type: String) {
        viewModelScope.launch {
            val schema = _currentTableSchema.value
            val initialGroupColId = if (type == "kanban" && schema != null) {
                schema.columns.find { it.type == "enum" || it.type == "tags" }?.id
            } else null

            repository.createView(tableId, CreateViewRequest(name = name, emoji = emoji, type = type, groupByColumnId = initialGroupColId)).fold(
                onSuccess = { newView ->
                    repository.getViews(tableId).onSuccess { views ->
                        val map = _viewsMap.value.toMutableMap()
                        map[tableId] = views
                        _viewsMap.value = map
                        selectView(tableId, newView.id)
                    }
                },
                onFailure = { _errorMessage.value = "Failed to create view: ${it.localizedMessage}" }
            )
        }
    }

    fun reorderViews(tableId: Int, viewIds: List<Int>) {
        viewModelScope.launch {
            repository.reorderViews(tableId, viewIds).fold(
                onSuccess = { views ->
                    val map = _viewsMap.value.toMutableMap()
                    map[tableId] = views
                    _viewsMap.value = map
                },
                onFailure = { _errorMessage.value = "Failed to reorder views: ${it.localizedMessage}" }
            )
        }
    }

    fun deleteView(viewId: Int) {
        viewModelScope.launch {
            val tblId = _selectedTableId.value ?: return@launch
            repository.deleteView(viewId).fold(
                onSuccess = { selectTable(tblId) },
                onFailure = { _errorMessage.value = "Failed to delete view: ${it.localizedMessage}" }
            )
        }
    }

    fun toggleSelectRow(rowId: Int) {
        val current = _selectedRowIds.value.toMutableSet()
        if (current.contains(rowId)) current.remove(rowId) else current.add(rowId)
        _selectedRowIds.value = current
    }

    fun selectAllRows(selectAll: Boolean) {
        if (selectAll) {
            _selectedRowIds.value = _rows.value.map { it.id }.toSet()
        } else {
            _selectedRowIds.value = emptySet()
        }
    }

    fun openRowInspector(row: RowData) {
        _activeInspectorRow.value = row
    }

    fun closeRowInspector() {
        _activeInspectorRow.value = null
    }

    fun createRowInContext(contextProperties: Map<String, JsonElement>) {
        val tblId = _selectedTableId.value ?: return
        viewModelScope.launch {
            val finalProps = contextProperties.toMutableMap()

            val filterConfig = _workingViewConfig.value?.filterConfig ?: emptyList()
            filterConfig.forEach { rule ->
                if (rule.operator == "equals" && rule.value != null && rule.value !is JsonNull) {
                    val propName = rule.targetProperty
                    if (propName.isNotBlank() && !finalProps.containsKey(propName)) {
                        finalProps[propName] = rule.value
                    }
                }
            }

            repository.createRow(tblId, CreateRowRequest(title = "New Page", properties = finalProps)).fold(
                onSuccess = { newRow ->
                    _rows.value = listOf(newRow) + _rows.value
                    openRowInspector(newRow)
                },
                onFailure = { _errorMessage.value = "Failed to create row: ${it.localizedMessage}" }
            )
        }
    }

    fun updateRowTitle(rowId: Int, newTitle: String) {
        val tblId = _selectedTableId.value ?: return
        viewModelScope.launch {
            repository.updateRow(tblId, rowId, UpdateRowRequest(title = newTitle)).onSuccess { updated ->
                _rows.value = _rows.value.map { if (it.id == rowId) updated else it }
                if (_activeInspectorRow.value?.id == rowId) _activeInspectorRow.value = updated
            }
        }
    }

    fun updateRowTitleAndContent(rowId: Int, title: String, content: String) {
        val tblId = _selectedTableId.value ?: return
        viewModelScope.launch {
            repository.updateRow(tblId, rowId, UpdateRowRequest(title = title, content = content)).onSuccess { updated ->
                _rows.value = _rows.value.map { if (it.id == rowId) updated else it }
                if (_activeInspectorRow.value?.id == rowId) _activeInspectorRow.value = updated
            }
        }
    }

    fun updateRowEmoji(rowId: Int, emoji: String) {
        val tblId = _selectedTableId.value ?: return
        viewModelScope.launch {
            repository.updateRow(tblId, rowId, UpdateRowRequest(emoji = emoji)).onSuccess { updated ->
                _rows.value = _rows.value.map { if (it.id == rowId) updated else it }
                if (_activeInspectorRow.value?.id == rowId) _activeInspectorRow.value = updated
            }
        }
    }

    fun updateRowProperty(rowId: Int, propertyName: String, newValue: JsonElement) {
        val tblId = _selectedTableId.value ?: return
        val existingRow = _rows.value.find { it.id == rowId } ?: return
        val newProps = existingRow.properties.toMutableMap()
        newProps[propertyName] = newValue

        viewModelScope.launch {
            repository.updateRow(tblId, rowId, UpdateRowRequest(properties = newProps)).onSuccess { updated ->
                _rows.value = _rows.value.map { if (it.id == rowId) updated else it }
                if (_activeInspectorRow.value?.id == rowId) _activeInspectorRow.value = updated
            }
        }
    }

    fun batchUpdateProperty(rowIds: List<Int>, propertyName: String, newValue: JsonElement) {
        val tblId = _selectedTableId.value ?: return
        viewModelScope.launch {
            repository.batchUpdateRows(
                tblId,
                BatchUpdateRowsRequest(
                    rowIds = rowIds,
                    properties = mapOf(propertyName to newValue)
                )
            ).fold(
                onSuccess = {
                    fetchRows(tblId, _searchQuery.value)
                    _selectedRowIds.value = emptySet()
                },
                onFailure = { _errorMessage.value = "Failed to batch update rows: ${it.localizedMessage}" }
            )
        }
    }

    fun deleteSelectedRows(rowIds: List<Int>) {
        val tblId = _selectedTableId.value ?: return
        viewModelScope.launch {
            rowIds.forEach { rId ->
                repository.deleteRow(tblId, rId)
            }
            _selectedRowIds.value = emptySet()
            fetchRows(tblId, _searchQuery.value)
        }
    }

    fun deleteSingleRow(rowId: Int) {
        val tblId = _selectedTableId.value ?: return
        viewModelScope.launch {
            repository.deleteRow(tblId, rowId).onSuccess {
                if (_activeInspectorRow.value?.id == rowId) closeRowInspector()
                fetchRows(tblId, _searchQuery.value)
            }
        }
    }

    fun addColumn(request: AddColumnRequest) {
        val tblId = _selectedTableId.value ?: return
        viewModelScope.launch {
            repository.addColumn(tblId, request).fold(
                onSuccess = { res ->
                    res.tableSchema?.let { _currentTableSchema.value = it }
                    fetchRows(tblId, _searchQuery.value)
                },
                onFailure = { _errorMessage.value = "Failed to add column: ${it.localizedMessage}" }
            )
        }
    }

    suspend fun fetchTargetTableRows(targetTableId: Int): List<RowData> {
        return repository.getRows(targetTableId).getOrDefault(RowListResponse()).rows
    }

    fun exportCsv() {
        val tblId = _selectedTableId.value ?: return
        val schema = _currentTableSchema.value ?: return
        val visCols = _workingViewConfig.value?.visibleColumns ?: emptyList()
        val selCols = if (visCols.isEmpty()) listOf("id", "title", "content", "created_at", "updated_at") + schema.columns.map { it.name } else visCols

        viewModelScope.launch {
            repository.exportCsv(
                ExportRequest(
                    tableId = tblId,
                    selectedColumns = selCols,
                    selectedRowIds = _selectedRowIds.value.toList().takeIf { it.isNotEmpty() }
                )
            ).fold(
                onSuccess = { response ->
                    val csvString = response.body()?.string() ?: ""
                    _csvDownloadSuccessMessage.value = "CSV Export generated (${csvString.lines().size} lines)"
                },
                onFailure = { _errorMessage.value = "Export failed: ${it.localizedMessage}" }
            )
        }
    }
}
