package com.thinkdb.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.thinkdb.app.data.model.ColumnSchema
import com.thinkdb.app.data.model.RowData
import com.thinkdb.app.ui.MainViewModel
import com.thinkdb.app.ui.components.FilterSortToolbar
import com.thinkdb.app.ui.components.Sidebar
import com.thinkdb.app.ui.inspector.DocumentInspectorModal
import com.thinkdb.app.ui.schema.AddColumnDialog
import com.thinkdb.app.ui.theme.ThinkDBTheme
import com.thinkdb.app.ui.views.grid.GridView
import com.thinkdb.app.ui.views.kanban.KanbanView
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            val themeMode by viewModel.themeMode.collectAsState()

            ThinkDBTheme(themeMode = themeMode) {
                MainAppScreen(viewModel = viewModel)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppScreen(viewModel: MainViewModel) {
    val themeMode by viewModel.themeMode.collectAsState()
    val baseUrl by viewModel.baseUrl.collectAsState()
    val namespaces by viewModel.namespaces.collectAsState()
    val tables by viewModel.tables.collectAsState()
    val viewsMap by viewModel.viewsMap.collectAsState()
    val selectedTableId by viewModel.selectedTableId.collectAsState()
    val selectedViewId by viewModel.selectedViewId.collectAsState()
    val currentTableSchema by viewModel.currentTableSchema.collectAsState()
    val workingViewConfig by viewModel.workingViewConfig.collectAsState()
    val rows by viewModel.rows.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedRowIds by viewModel.selectedRowIds.collectAsState()
    val activeInspectorRow by viewModel.activeInspectorRow.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val csvSuccessMessage by viewModel.csvDownloadSuccessMessage.collectAsState()

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    var showAddColumnDialog by remember { mutableStateOf(false) }
    var showSettingsDialog by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    LaunchedEffect(csvSuccessMessage) {
        csvSuccessMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearCsvSuccess()
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                Sidebar(
                    namespaces = namespaces,
                    tables = tables,
                    viewsMap = viewsMap,
                    selectedTableId = selectedTableId,
                    selectedViewId = selectedViewId,
                    onSelectView = { tId, vId ->
                        viewModel.selectView(tId, vId)
                        scope.launch { drawerState.close() }
                    },
                    onToggleNamespaceCollapse = { nsId, collapsed -> viewModel.toggleNamespaceCollapse(nsId, collapsed) },
                    onCreateNamespace = { name, emoji -> viewModel.createNamespace(name, emoji) },
                    onUpdateNamespace = { nsId, name, emoji -> viewModel.updateNamespace(nsId, name, emoji) },
                    onDeleteNamespace = { nsId -> viewModel.deleteNamespace(nsId) },
                    onCreateTable = { nsId, name, emoji -> viewModel.createTable(nsId, name, emoji) },
                    onUpdateTable = { tId, name, emoji, nsId -> viewModel.updateTable(tId, name, emoji, nsId) },
                    onDeleteTable = { tId -> viewModel.deleteTable(tId) },
                    onCreateView = { tId, name, emoji, type -> viewModel.createView(tId, name, emoji, type) },
                    onReorderViews = { tId, vIds -> viewModel.reorderViews(tId, vIds) },
                    onDeleteView = { vId -> viewModel.deleteView(vId) },
                    onCloseDrawer = { scope.launch { drawerState.close() } }
                )
            }
        }
    ) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                val currentView = viewsMap[selectedTableId]?.find { it.id == selectedViewId }

                FilterSortToolbar(
                    currentTable = currentTableSchema,
                    currentView = currentView,
                    workingViewConfig = workingViewConfig,
                    hasUnsavedViewChanges = viewModel.hasUnsavedViewChanges,
                    onSaveViewChanges = { viewModel.saveViewChanges() },
                    onDiscardViewChanges = { viewModel.discardViewChanges() },
                    onUpdateWorkingView = { updated -> viewModel.updateWorkingView(updated) },
                    searchQuery = searchQuery,
                    onSearchQueryChange = { viewModel.setSearchQuery(it) },
                    onOpenAddColumnDialog = { showAddColumnDialog = true },
                    onExportCsv = { viewModel.exportCsv() },
                    themeMode = themeMode,
                    onToggleTheme = { viewModel.setThemeMode(it) },
                    onToggleSidebar = {
                        scope.launch {
                            if (drawerState.isClosed) drawerState.open() else drawerState.close()
                        }
                    },
                    onRefreshWorkspace = { viewModel.loadWorkspace() },
                    onOpenServerSettings = { showSettingsDialog = true }
                )

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else if (currentTableSchema == null || workingViewConfig == null) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = "Tap the menu icon to select or create a table view.",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    if (workingViewConfig?.type == "kanban") {
                        KanbanView(
                            tableSchema = currentTableSchema!!,
                            viewSchema = workingViewConfig!!,
                            rows = rows,
                            onOpenRowInspector = { viewModel.openRowInspector(it) },
                            onCreateCardInColumn = { colVal ->
                                val groupCol = currentTableSchema?.columns?.find { it.id == workingViewConfig?.groupByColumnId }
                                val props = groupCol?.let { mapOf(it.name to kotlinx.serialization.json.JsonPrimitive(colVal)) } ?: emptyMap()
                                viewModel.createRowInContext(props)
                            },
                            onMoveCardToColumn = { rowId, newColVal ->
                                val groupCol = currentTableSchema?.columns?.find { it.id == workingViewConfig?.groupByColumnId }
                                if (groupCol != null) {
                                    viewModel.updateRowProperty(rowId, groupCol.name, kotlinx.serialization.json.JsonPrimitive(newColVal))
                                }
                            },
                            onUpdateRowTitle = { rowId, newTitle -> viewModel.updateRowTitle(rowId, newTitle) },
                            modifier = Modifier.weight(1f)
                        )
                    } else {
                        GridView(
                            tableSchema = currentTableSchema!!,
                            viewSchema = workingViewConfig!!,
                            rows = rows,
                            selectedRowIds = selectedRowIds,
                            onToggleSelectRow = { viewModel.toggleSelectRow(it) },
                            onSelectAllRows = { viewModel.selectAllRows(it) },
                            onOpenRowInspector = { viewModel.openRowInspector(it) },
                            onCreateRowInContext = { props -> viewModel.createRowInContext(props) },
                            onUpdateRowTitle = { rowId, newTitle -> viewModel.updateRowTitle(rowId, newTitle) },
                            onUpdateRowProperty = { rowId, propName, newVal -> viewModel.updateRowProperty(rowId, propName, newVal) },
                            onBatchUpdateProperty = { selIds, propName, newVal -> viewModel.batchUpdateProperty(selIds, propName, newVal) },
                            onDeleteSelectedRows = { selIds -> viewModel.deleteSelectedRows(selIds) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    }

    // Modal Inspector
    activeInspectorRow?.let { row ->
        currentTableSchema?.let { schema ->
            DocumentInspectorModal(
                row = row,
                tableSchema = schema,
                allTables = tables,
                onFetchTargetRows = { targetId -> viewModel.fetchTargetTableRows(targetId) },
                onUpdateRowTitleAndContent = { title, content -> viewModel.updateRowTitleAndContent(row.id, title, content) },
                onUpdateRowEmoji = { emoji -> viewModel.updateRowEmoji(row.id, emoji) },
                onUpdateRowProperty = { propName, newVal -> viewModel.updateRowProperty(row.id, propName, newVal) },
                onDeleteRow = { viewModel.deleteSingleRow(row.id) },
                onDismiss = { viewModel.closeRowInspector() }
            )
        }
    }

    // Add Column Dialog
    if (showAddColumnDialog && currentTableSchema != null) {
        AddColumnDialog(
            tableSchema = currentTableSchema!!,
            allTables = tables,
            onAddColumn = { req ->
                viewModel.addColumn(req)
                showAddColumnDialog = false
            },
            onDismiss = { showAddColumnDialog = false }
        )
    }

    // Server Settings Dialog
    if (showSettingsDialog) {
        var urlInput by remember { mutableStateOf(baseUrl) }

        AlertDialog(
            onDismissRequest = { showSettingsDialog = false },
            title = { Text("Backend Server Settings") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Current Base URL: $baseUrl", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        value = urlInput,
                        onValueChange = { urlInput = it },
                        label = { Text("Server Base URL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text("Default for Android Emulator: http://10.0.2.2:8000/", style = MaterialTheme.typography.labelSmall)
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (urlInput.isNotBlank()) {
                        viewModel.setBaseUrl(urlInput.trim())
                        showSettingsDialog = false
                    }
                }) {
                    Text("Save & Connect")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettingsDialog = false }) { Text("Cancel") }
            }
        )
    }
}
