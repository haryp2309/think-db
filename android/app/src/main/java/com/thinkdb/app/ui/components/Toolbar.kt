package com.thinkdb.app.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thinkdb.app.data.model.*
import com.thinkdb.app.ui.theme.AppThemeMode

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FilterSortToolbar(
    currentTable: TableSchema?,
    currentView: ViewSchema?,
    workingViewConfig: ViewSchema?,
    hasUnsavedViewChanges: Boolean,
    onSaveViewChanges: () -> Unit,
    onDiscardViewChanges: () -> Unit,
    onUpdateWorkingView: (ViewSchema) -> Unit,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onOpenAddColumnDialog: () -> Unit,
    onExportCsv: () -> Unit,
    themeMode: AppThemeMode,
    onToggleTheme: (AppThemeMode) -> Unit,
    onToggleSidebar: () -> Unit,
    onRefreshWorkspace: (() -> Unit)? = null,
    onOpenServerSettings: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var showFilterSheet by remember { mutableStateOf(false) }
    var showSortSheet by remember { mutableStateOf(false) }
    var showGroupBySheet by remember { mutableStateOf(false) }
    var showPropertiesSheet by remember { mutableStateOf(false) }

    var isSearchExpanded by remember { mutableStateOf(false) }
    var showOverflowMenu by remember { mutableStateOf(false) }

    val columns = currentTable?.columns ?: emptyList()
    val isKanban = workingViewConfig?.type == "kanban"

    Surface(
        color = MaterialTheme.colorScheme.background,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isSearchExpanded) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = onSearchQueryChange,
                        placeholder = { Text("Search rows...") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                        trailingIcon = {
                            IconButton(onClick = {
                                onSearchQueryChange("")
                                isSearchExpanded = false
                            }) {
                                Icon(Icons.Default.Close, contentDescription = "Close search", modifier = Modifier.size(18.dp))
                            }
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                } else {
                    IconButton(onClick = onToggleSidebar, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Menu, contentDescription = "Open Drawer")
                    }

                    Spacer(modifier = Modifier.width(4.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = currentTable?.emoji ?: "📁", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = currentTable?.name ?: "ThinkDB",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        if (currentView != null) {
                            Text(
                                text = "${currentView.emoji} ${currentView.name} • ${workingViewConfig?.type?.uppercase() ?: "GRID"}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    IconButton(onClick = { isSearchExpanded = true }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Search, contentDescription = "Search", modifier = Modifier.size(20.dp))
                    }

                    if (onOpenServerSettings != null) {
                        IconButton(onClick = onOpenServerSettings, modifier = Modifier.size(36.dp)) {
                            Icon(Icons.Default.Settings, contentDescription = "Server Settings", modifier = Modifier.size(20.dp))
                        }
                    }

                    Box {
                        IconButton(onClick = { showOverflowMenu = true }, modifier = Modifier.size(36.dp)) {
                            Icon(Icons.Default.MoreVert, contentDescription = "More Actions", modifier = Modifier.size(20.dp))
                        }

                        DropdownMenu(
                            expanded = showOverflowMenu,
                            onDismissRequest = { showOverflowMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Add Custom Property") },
                                leadingIcon = { Icon(Icons.Default.PostAdd, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    onOpenAddColumnDialog()
                                }
                            )

                            DropdownMenuItem(
                                text = { Text("Export CSV") },
                                leadingIcon = { Icon(Icons.Default.FileDownload, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    onExportCsv()
                                }
                            )

                            if (onRefreshWorkspace != null) {
                                DropdownMenuItem(
                                    text = { Text("Refresh Workspace") },
                                    leadingIcon = { Icon(Icons.Default.Refresh, contentDescription = null) },
                                    onClick = {
                                        showOverflowMenu = false
                                        onRefreshWorkspace()
                                    }
                                )
                            }

                            if (onOpenServerSettings != null) {
                                DropdownMenuItem(
                                    text = { Text("Server Base URL Settings") },
                                    leadingIcon = { Icon(Icons.Default.Settings, contentDescription = null) },
                                    onClick = {
                                        showOverflowMenu = false
                                        onOpenServerSettings()
                                    }
                                )
                            }

                            HorizontalDivider()

                            DropdownMenuItem(
                                text = { Text("Theme: ${themeMode.name}") },
                                leadingIcon = {
                                    val icon = when (themeMode) {
                                        AppThemeMode.SYSTEM -> Icons.Default.SettingsSuggest
                                        AppThemeMode.LIGHT -> Icons.Default.LightMode
                                        AppThemeMode.DARK -> Icons.Default.DarkMode
                                    }
                                    Icon(icon, contentDescription = null)
                                },
                                onClick = {
                                    showOverflowMenu = false
                                    val nextMode = when (themeMode) {
                                        AppThemeMode.SYSTEM -> AppThemeMode.LIGHT
                                        AppThemeMode.LIGHT -> AppThemeMode.DARK
                                        AppThemeMode.DARK -> AppThemeMode.SYSTEM
                                    }
                                    onToggleTheme(nextMode)
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Filter/Sort/Grouping/Properties Chips
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                item {
                    val activeFilters = workingViewConfig?.filterConfig?.size ?: 0
                    FilterChip(
                        selected = activeFilters > 0,
                        onClick = { showFilterSheet = true },
                        leadingIcon = { Icon(Icons.Default.FilterList, contentDescription = null, modifier = Modifier.size(14.dp)) },
                        label = { Text(if (activeFilters > 0) "Filter ($activeFilters)" else "Filter", fontSize = 12.sp) },
                        shape = CircleShape
                    )
                }

                item {
                    val activeSorts = workingViewConfig?.sortConfig?.size ?: 0
                    FilterChip(
                        selected = activeSorts > 0,
                        onClick = { showSortSheet = true },
                        leadingIcon = { Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = null, modifier = Modifier.size(14.dp)) },
                        label = { Text(if (activeSorts > 0) "Sort ($activeSorts)" else "Sort", fontSize = 12.sp) },
                        shape = CircleShape
                    )
                }

                item {
                    val selectedGroupCol = columns.find { it.id == workingViewConfig?.groupByColumnId }
                    FilterChip(
                        selected = selectedGroupCol != null,
                        onClick = { showGroupBySheet = true },
                        leadingIcon = { Icon(Icons.Default.ViewColumn, contentDescription = null, modifier = Modifier.size(14.dp)) },
                        label = { Text(selectedGroupCol?.let { "Group: ${it.name}" } ?: if (isKanban) "Group: Req" else "Group", fontSize = 12.sp) },
                        shape = CircleShape
                    )
                }

                item {
                    FilterChip(
                        selected = false,
                        onClick = { showPropertiesSheet = true },
                        leadingIcon = { Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(14.dp)) },
                        label = { Text("Properties", fontSize = 12.sp) },
                        shape = CircleShape
                    )
                }
            }

            AnimatedVisibility(visible = hasUnsavedViewChanges && workingViewConfig != null) {
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Unsaved View Config",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            TextButton(onClick = onDiscardViewChanges) { Text("Discard", fontSize = 12.sp) }
                            Button(onClick = onSaveViewChanges, contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp)) {
                                Text("Save View", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showFilterSheet && workingViewConfig != null) {
        ModalBottomSheet(onDismissRequest = { showFilterSheet = false }) {
            FilterConfigContent(
                columns = columns,
                currentFilters = workingViewConfig.filterConfig,
                onApplyFilters = { filters ->
                    onUpdateWorkingView(workingViewConfig.copy(filterConfig = filters))
                    showFilterSheet = false
                }
            )
        }
    }

    if (showSortSheet && workingViewConfig != null) {
        ModalBottomSheet(onDismissRequest = { showSortSheet = false }) {
            SortConfigContent(
                columns = columns,
                currentSorts = workingViewConfig.sortConfig,
                onApplySorts = { sorts ->
                    onUpdateWorkingView(workingViewConfig.copy(sortConfig = sorts))
                    showSortSheet = false
                }
            )
        }
    }

    if (showGroupBySheet && workingViewConfig != null) {
        ModalBottomSheet(onDismissRequest = { showGroupBySheet = false }) {
            GroupByContent(
                columns = columns,
                isKanban = isKanban,
                currentGroupId = workingViewConfig.groupByColumnId,
                onSelectGroup = { groupColId ->
                    onUpdateWorkingView(workingViewConfig.copy(groupByColumnId = groupColId))
                    showGroupBySheet = false
                }
            )
        }
    }

    if (showPropertiesSheet && workingViewConfig != null) {
        ModalBottomSheet(onDismissRequest = { showPropertiesSheet = false }) {
            PropertiesVisibilityContent(
                columns = columns,
                isKanban = isKanban,
                visibleColumns = workingViewConfig.visibleColumns,
                cardProperties = workingViewConfig.cardProperties,
                onApplyProperties = { visCols, cardProps ->
                    onUpdateWorkingView(workingViewConfig.copy(visibleColumns = visCols, cardProperties = cardProps))
                    showPropertiesSheet = false
                }
            )
        }
    }
}

@Composable
fun FilterConfigContent(
    columns: List<ColumnSchema>,
    currentFilters: List<FilterRule>,
    onApplyFilters: (List<FilterRule>) -> Unit
) {
    var filters by remember { mutableStateOf(currentFilters.toMutableList()) }

    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Filter Rules", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

        filters.forEachIndexed { idx, rule ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(text = rule.columnName ?: columns.firstOrNull()?.name ?: "", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                Text(text = rule.operator, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                IconButton(onClick = {
                    val m = filters.toMutableList(); m.removeAt(idx); filters = m
                }) {
                    Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                }
            }
        }

        OutlinedButton(
            onClick = {
                val first = columns.firstOrNull()
                if (first != null) filters = (filters + FilterRule(columnId = first.id, columnName = first.name, operator = "equals")).toMutableList()
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("+ Add Filter Rule")
        }

        Button(onClick = { onApplyFilters(filters) }, modifier = Modifier.fillMaxWidth()) {
            Text("Apply Filters")
        }
    }
}

@Composable
fun SortConfigContent(
    columns: List<ColumnSchema>,
    currentSorts: List<SortRule>,
    onApplySorts: (List<SortRule>) -> Unit
) {
    var sorts by remember { mutableStateOf(currentSorts.toMutableList()) }

    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Sorting Rules", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

        sorts.forEachIndexed { idx, rule ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(text = rule.columnName ?: "Title", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                TextButton(onClick = {
                    val m = sorts.toMutableList()
                    val nextDir = if (rule.direction == "asc") "desc" else "asc"
                    m[idx] = rule.copy(direction = nextDir)
                    sorts = m
                }) {
                    Text(rule.direction.uppercase())
                }
                IconButton(onClick = {
                    val m = sorts.toMutableList(); m.removeAt(idx); sorts = m
                }) {
                    Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                }
            }
        }

        OutlinedButton(
            onClick = {
                val first = columns.firstOrNull()
                if (first != null) sorts = (sorts + SortRule(columnId = first.id, columnName = first.name, direction = "asc")).toMutableList()
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("+ Add Sort Rule")
        }

        Button(onClick = { onApplySorts(sorts) }, modifier = Modifier.fillMaxWidth()) {
            Text("Apply Sorts")
        }
    }
}

@Composable
fun GroupByContent(
    columns: List<ColumnSchema>,
    isKanban: Boolean,
    currentGroupId: Int?,
    onSelectGroup: (Int?) -> Unit
) {
    val validColumns = if (isKanban) columns.filter { it.type == "enum" || it.type == "tags" } else columns

    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(if (isKanban) "Select Kanban Column Group" else "Select Row Grouping", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

        if (!isKanban) {
            Surface(
                onClick = { onSelectGroup(null) },
                shape = RoundedCornerShape(8.dp),
                color = if (currentGroupId == null) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = currentGroupId == null, onClick = null)
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("No Grouping (Flat Database List)")
                }
            }
        }

        validColumns.forEach { col ->
            val selected = currentGroupId == col.id
            Surface(
                onClick = { onSelectGroup(col.id) },
                shape = RoundedCornerShape(8.dp),
                color = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = selected, onClick = null)
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("${col.name} (${col.type})", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
fun PropertiesVisibilityContent(
    columns: List<ColumnSchema>,
    isKanban: Boolean,
    visibleColumns: List<String>,
    cardProperties: List<String>,
    onApplyProperties: (visibleColumns: List<String>, cardProperties: List<String>) -> Unit
) {
    val allPropertyNames = listOf("title", "content") + columns.map { it.name }
    var visColsState by remember { mutableStateOf(if (visibleColumns.isEmpty()) allPropertyNames else visibleColumns) }
    var cardPropsState by remember { mutableStateOf(if (cardProperties.isEmpty()) allPropertyNames else cardProperties) }

    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Property Column Visibility", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

        allPropertyNames.forEach { propName ->
            val isChecked = if (isKanban) cardPropsState.contains(propName) else visColsState.contains(propName)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = if (propName == "title") "Title" else if (propName == "content") "Content Snippet" else propName)
                Switch(
                    checked = isChecked,
                    onCheckedChange = { checked ->
                        if (isKanban) {
                            cardPropsState = if (checked) cardPropsState + propName else cardPropsState - propName
                        } else {
                            visColsState = if (checked) visColsState + propName else visColsState - propName
                        }
                    }
                )
            }
        }

        Button(onClick = { onApplyProperties(visColsState, cardPropsState) }, modifier = Modifier.fillMaxWidth()) {
            Text("Apply Preferences")
        }
    }
}
