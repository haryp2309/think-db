package com.thinkdb.app.ui.views.grid

import androidx.compose.animation.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import com.thinkdb.app.ui.theme.*
import kotlinx.serialization.json.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GridView(
    tableSchema: TableSchema,
    viewSchema: ViewSchema,
    rows: List<RowData>,
    selectedRowIds: Set<Int>,
    onToggleSelectRow: (Int) -> Unit,
    onSelectAllRows: (Boolean) -> Unit,
    onOpenRowInspector: (RowData) -> Unit,
    onCreateRowInContext: (properties: Map<String, JsonElement>) -> Unit,
    onUpdateRowTitle: (rowId: Int, newTitle: String) -> Unit,
    onUpdateRowProperty: (rowId: Int, propertyName: String, newValue: JsonElement) -> Unit,
    onBatchUpdateProperty: (selectedIds: List<Int>, propertyName: String, newValue: JsonElement) -> Unit,
    onDeleteSelectedRows: (selectedIds: List<Int>) -> Unit,
    modifier: Modifier = Modifier
) {
    val columns = tableSchema.columns
    val visibleColNames = viewSchema.visibleColumns.ifEmpty {
        listOf("title", "content") + columns.map { it.name }
    }
    val activeColumns = remember(columns, visibleColNames) {
        columns.filter { visibleColNames.contains(it.name) }
    }
    val groupByCol = columns.find { it.id == viewSchema.groupByColumnId }

    var showBatchMenu by remember { mutableStateOf(false) }
    var selectedBatchProperty by remember { mutableStateOf<ColumnSchema?>(null) }
    var collapsedGroups by remember { mutableStateOf(setOf<String>()) }

    val horizontalScrollState = rememberScrollState()

    Box(modifier = modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${rows.size} Row(s)",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (rows.isNotEmpty()) {
                    TextButton(onClick = { onSelectAllRows(selectedRowIds.size != rows.size) }) {
                        Text(if (selectedRowIds.size == rows.size) "Deselect All" else "Select All", fontSize = 12.sp)
                    }
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))

            if (groupByCol != null) {
                val groupMap = remember(rows, groupByCol.name, groupByCol.type) {
                    val map = mutableMapOf<String, MutableList<RowData>>()
                    rows.forEach { row ->
                        val propVal = row.properties[groupByCol.name]
                        if (groupByCol.type == "tags" && propVal is JsonArray) {
                            val tagsList = propVal.mapNotNull { it.jsonPrimitive.contentOrNull }
                            if (tagsList.isEmpty()) {
                                map.getOrPut("Unassigned") { mutableListOf() }.add(row)
                            } else {
                                tagsList.forEach { tag ->
                                    map.getOrPut(tag) { mutableListOf() }.add(row)
                                }
                            }
                        } else {
                            val strVal = propVal?.jsonPrimitive?.contentOrNull?.takeIf { it.isNotBlank() } ?: "Unassigned"
                            map.getOrPut(strVal) { mutableListOf() }.add(row)
                        }
                    }
                    map
                }

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    contentPadding = PaddingValues(bottom = 80.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    groupMap.forEach { (groupValue, groupRows) ->
                        val isCollapsed = collapsedGroups.contains(groupValue)

                        item(key = "header_$groupValue") {
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        collapsedGroups = if (isCollapsed) collapsedGroups - groupValue else collapsedGroups + groupValue
                                    }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = if (isCollapsed) Icons.Default.ChevronRight else Icons.Default.KeyboardArrowDown,
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Group: $groupValue (${groupRows.size})",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    IconButton(
                                        onClick = {
                                            val seedVal = if (groupByCol.type == "tags") buildJsonArray { add(groupValue) } else JsonPrimitive(groupValue)
                                            onCreateRowInContext(mapOf(groupByCol.name to seedVal))
                                        },
                                        modifier = Modifier.size(26.dp)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = "Add row in $groupValue", modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }

                        if (!isCollapsed) {
                            items(groupRows, key = { "item_${groupValue}_${it.id}" }) { row ->
                                MinimalGridRowItem(
                                    row = row,
                                    activeColumns = activeColumns,
                                    visibleColNames = visibleColNames,
                                    isSelected = selectedRowIds.contains(row.id),
                                    hasAnySelection = selectedRowIds.isNotEmpty(),
                                    horizontalScrollState = horizontalScrollState,
                                    onToggleSelect = { onToggleSelectRow(row.id) },
                                    onOpenInspector = { onOpenRowInspector(row) }
                                )
                            }
                        }
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                    contentPadding = PaddingValues(bottom = 80.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    item(key = "grid_headers") {
                        MinimalGridHeaderRow(
                            activeColumns = activeColumns,
                            visibleColNames = visibleColNames,
                            horizontalScrollState = horizontalScrollState
                        )
                    }

                    items(rows, key = { it.id }) { row ->
                        MinimalGridRowItem(
                            row = row,
                            activeColumns = activeColumns,
                            visibleColNames = visibleColNames,
                            isSelected = selectedRowIds.contains(row.id),
                            hasAnySelection = selectedRowIds.isNotEmpty(),
                            horizontalScrollState = horizontalScrollState,
                            onToggleSelect = { onToggleSelectRow(row.id) },
                            onOpenInspector = { onOpenRowInspector(row) }
                        )
                    }
                }
            }
        }

        ExtendedFloatingActionButton(
            onClick = { onCreateRowInContext(emptyMap()) },
            icon = { Icon(Icons.Default.Add, contentDescription = null) },
            text = { Text("New Row") },
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp)
        )

        AnimatedVisibility(
            visible = selectedRowIds.isNotEmpty(),
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 80.dp)
        ) {
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                tonalElevation = 6.dp,
                shape = RoundedCornerShape(20.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "${selectedRowIds.size} Selected",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )

                    Button(
                        onClick = { showBatchMenu = true },
                        shape = CircleShape
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Edit")
                    }

                    Button(
                        onClick = { onDeleteSelectedRows(selectedRowIds.toList()) },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        shape = CircleShape
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Delete")
                    }
                }
            }
        }
    }

    if (showBatchMenu) {
        AlertDialog(
            onDismissRequest = { showBatchMenu = false },
            title = { Text("Edit Property for ${selectedRowIds.size} Selected Rows") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    columns.filter { !it.isReadonly && it.type != "referenced" && it.type != "rollup" }.forEach { col ->
                        Surface(
                            onClick = {
                                selectedBatchProperty = col
                                showBatchMenu = false
                            },
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("${col.name} (${col.type})", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showBatchMenu = false }) { Text("Cancel") }
            }
        )
    }

    selectedBatchProperty?.let { batchCol ->
        BatchPropertyValueDialog(
            column = batchCol,
            onApply = { newValueJson ->
                onBatchUpdateProperty(selectedRowIds.toList(), batchCol.name, newValueJson)
                selectedBatchProperty = null
            },
            onDismiss = { selectedBatchProperty = null }
        )
    }
}

@Composable
fun MinimalGridHeaderRow(
    activeColumns: List<ColumnSchema>,
    visibleColNames: List<String>,
    horizontalScrollState: androidx.compose.foundation.ScrollState
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .horizontalScroll(horizontalScrollState)
                .padding(vertical = 8.dp, horizontal = 12.dp)
        ) {
            // Title Header Column
            Box(
                modifier = Modifier.width(180.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Text(
                    text = "Aa  Title",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (visibleColNames.contains("content")) {
                Box(
                    modifier = Modifier.width(160.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Text(
                        text = "📝  Content Snippet",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            activeColumns.forEach { col ->
                val typeIcon = when (col.type) {
                    "string" -> "Aa"
                    "enum" -> "v"
                    "tags" -> "#"
                    "reference" -> "->"
                    "rollup" -> "Fx"
                    "referenced" -> "Ref"
                    else -> "•"
                }

                Box(
                    modifier = Modifier.width(140.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Text(
                        text = "$typeIcon  ${col.name}",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MinimalGridRowItem(
    row: RowData,
    activeColumns: List<ColumnSchema>,
    visibleColNames: List<String>,
    isSelected: Boolean,
    hasAnySelection: Boolean,
    horizontalScrollState: androidx.compose.foundation.ScrollState,
    onToggleSelect: () -> Unit,
    onOpenInspector: () -> Unit
) {
    val titleText = row.title.ifEmpty { "Untitled" }

    Surface(
        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else MaterialTheme.colorScheme.surface,
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = {
                    if (hasAnySelection) {
                        onToggleSelect()
                    } else {
                        onOpenInspector()
                    }
                },
                onLongClick = {
                    onToggleSelect()
                }
            )
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .horizontalScroll(horizontalScrollState)
                    .padding(vertical = 10.dp, horizontal = 12.dp)
            ) {
                // Title Cell (No Checkbox, Long-Press to Select)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.width(180.dp)
                ) {
                    Text(text = row.emoji ?: "📄", fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = titleText,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                if (visibleColNames.contains("content")) {
                    Box(
                        modifier = Modifier.width(160.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        Text(
                            text = row.content.ifBlank { "-" },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                activeColumns.forEach { col ->
                    val propVal = row.properties[col.name]
                    Box(
                        modifier = Modifier.width(140.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        RenderPropertyBadge(column = col, value = propVal, onUpdateValue = {})
                    }
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
        }
    }
}

@Composable
fun RenderPropertyBadge(
    column: ColumnSchema,
    value: JsonElement?,
    onUpdateValue: (JsonElement) -> Unit
) {
    if (value == null || value is JsonNull) {
        Text(text = "-", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }

    when (column.type) {
        "string" -> {
            Text(text = value.jsonPrimitive.contentOrNull ?: "-", style = MaterialTheme.typography.bodySmall)
        }
        "enum" -> {
            val strVal = value.jsonPrimitive.contentOrNull ?: "-"
            val (bgColor, textColor) = when (strVal.lowercase()) {
                "done", "completed", "high" -> BadgeReferencedBackgroundLight to BadgeReferencedTextLight
                "in progress", "active", "medium" -> BadgeEnumBackgroundLight to BadgeEnumTextLight
                "to do", "pending", "low" -> BadgeTagBackgroundLight to BadgeTagTextLight
                else -> BadgeEnumBackgroundLight to BadgeEnumTextLight
            }

            Surface(
                color = bgColor,
                shape = CircleShape
            ) {
                Text(
                    text = strVal,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }
        }
        "tags" -> {
            val tagsList = if (value is JsonArray) value.mapNotNull { it.jsonPrimitive.contentOrNull } else listOf(value.jsonPrimitive.contentOrNull ?: "")
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                tagsList.take(2).forEach { tag ->
                    Surface(
                        color = BadgeTagBackgroundLight,
                        shape = CircleShape
                    ) {
                        Text(
                            text = tag,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = BadgeTagTextLight,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
        "reference" -> {
            if (value is JsonObject) {
                val title = value["title"]?.jsonPrimitive?.contentOrNull ?: "Linked"
                val emoji = value["emoji"]?.jsonPrimitive?.contentOrNull ?: "🔗"
                Surface(
                    color = BadgeRefBackgroundLight,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "$emoji $title",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = BadgeRefTextLight,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            } else {
                Text(text = "Linked", style = MaterialTheme.typography.bodySmall)
            }
        }
        "referenced" -> {
            Surface(
                color = BadgeReferencedBackgroundLight,
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = "🔒 REF",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = BadgeReferencedTextLight,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }
        }
        "rollup" -> {
            Surface(
                color = BadgeRollupBackgroundLight,
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = "🧮 ${value.jsonPrimitive.contentOrNull ?: value.toString()}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = BadgeRollupTextLight,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }
        }
    }
}

@Composable
fun BatchPropertyValueDialog(
    column: ColumnSchema,
    onApply: (JsonElement) -> Unit,
    onDismiss: () -> Unit
) {
    var textInput by remember { mutableStateOf("") }
    var selectedOption by remember { mutableStateOf<String?>(null) }
    var selectedTags by remember { mutableStateOf<Set<String>>(emptySet()) }

    val optionsList = remember(column.options) {
        val list = mutableListOf<String>()
        val optJson = column.options
        if (optJson is JsonArray) {
            optJson.forEach { elem ->
                if (elem is JsonPrimitive) list.add(elem.content)
                else if (elem is JsonObject) elem["value"]?.jsonPrimitive?.contentOrNull?.let { list.add(it) }
            }
        }
        list
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Update '${column.name}' for Selected Rows") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                when (column.type) {
                    "enum" -> {
                        Text("Select Option:", style = MaterialTheme.typography.labelMedium)
                        optionsList.forEach { opt ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { selectedOption = opt },
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(selected = selectedOption == opt, onClick = { selectedOption = opt })
                                Text(opt)
                            }
                        }
                    }
                    "tags" -> {
                        Text("Select Tags:", style = MaterialTheme.typography.labelMedium)
                        optionsList.forEach { opt ->
                            val isChecked = selectedTags.contains(opt)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedTags = if (isChecked) selectedTags - opt else selectedTags + opt
                                    },
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Checkbox(checked = isChecked, onCheckedChange = { checked ->
                                    selectedTags = if (checked) selectedTags + opt else selectedTags - opt
                                })
                                Text(opt)
                            }
                        }
                    }
                    else -> {
                        OutlinedTextField(
                            value = textInput,
                            onValueChange = { textInput = it },
                            label = { Text("New Value") },
                            singleLine = true,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val resultJson: JsonElement = when (column.type) {
                        "enum" -> JsonPrimitive(selectedOption ?: "")
                        "tags" -> buildJsonArray { selectedTags.forEach { add(it) } }
                        else -> JsonPrimitive(textInput)
                    }
                    onApply(resultJson)
                }
            ) {
                Text("Apply Batch Update")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
