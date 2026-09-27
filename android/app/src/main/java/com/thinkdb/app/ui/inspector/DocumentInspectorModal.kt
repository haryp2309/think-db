package com.thinkdb.app.ui.inspector

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.thinkdb.app.data.model.*
import com.thinkdb.app.ui.components.ConfirmDeleteDialog
import com.thinkdb.app.ui.components.EmojiPickerModal
import kotlinx.coroutines.delay
import kotlinx.serialization.json.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentInspectorModal(
    row: RowData,
    tableSchema: TableSchema,
    allTables: List<TableSummary>,
    onFetchTargetRows: suspend (targetTableId: Int) -> List<RowData>,
    onUpdateRowTitleAndContent: (title: String, content: String) -> Unit,
    onUpdateRowEmoji: (emoji: String) -> Unit,
    onUpdateRowProperty: (propertyName: String, newValue: JsonElement) -> Unit,
    onDeleteRow: () -> Unit,
    onDismiss: () -> Unit
) {
    var titleState by remember(row.id) { mutableStateOf(row.title) }
    var contentState by remember(row.id) { mutableStateOf(row.content) }
    var emojiState by remember(row.id) { mutableStateOf(row.emoji ?: "📄") }

    var showEmojiPicker by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var editModeTab by remember { mutableIntStateOf(0) }

    LaunchedEffect(titleState, contentState) {
        if (titleState != row.title || contentState != row.content) {
            delay(1000)
            onUpdateRowTitleAndContent(titleState, contentState)
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Surface(
            color = MaterialTheme.colorScheme.background,
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Top App Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to Workspace")
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Auto-saving (1s)",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        IconButton(onClick = { showDeleteConfirm = true }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete Page", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))

                // Scrollable Document Page
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Header (Emoji + Borderless Title)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Surface(
                            onClick = { showEmojiPicker = true },
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.size(54.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(text = emojiState, fontSize = 28.sp)
                            }
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        OutlinedTextField(
                            value = titleState,
                            onValueChange = { titleState = it },
                            placeholder = { Text("Untitled Document") },
                            singleLine = true,
                            textStyle = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Properties Block
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "Properties",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            tableSchema.columns.forEach { col ->
                                PropertyInspectorField(
                                    column = col,
                                    row = row,
                                    allTables = allTables,
                                    onFetchTargetRows = onFetchTargetRows,
                                    onUpdateProperty = { newVal -> onUpdateRowProperty(col.name, newVal) }
                                )
                            }
                        }
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))

                    // Markdown Section Title + Mode Switcher
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Page Body", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                        SingleChoiceSegmentedButtonRow {
                            SegmentedButton(
                                selected = editModeTab == 0,
                                onClick = { editModeTab = 0 },
                                shape = SegmentedButtonDefaults.itemShape(index = 0, count = 3)
                            ) {
                                Text("Edit", fontSize = 12.sp)
                            }
                            SegmentedButton(
                                selected = editModeTab == 1,
                                onClick = { editModeTab = 1 },
                                shape = SegmentedButtonDefaults.itemShape(index = 1, count = 3)
                            ) {
                                Text("Split", fontSize = 12.sp)
                            }
                            SegmentedButton(
                                selected = editModeTab == 2,
                                onClick = { editModeTab = 2 },
                                shape = SegmentedButtonDefaults.itemShape(index = 2, count = 3)
                            ) {
                                Text("Preview", fontSize = 12.sp)
                            }
                        }
                    }

                    // Markdown Quick Rich Formatting Toolbar
                    if (editModeTab == 0 || editModeTab == 1) {
                        MarkdownFormattingToolbar(
                            onInsertMarkdown = { prefix, suffix ->
                                contentState = "$contentState$prefix$suffix"
                            }
                        )
                    }

                    // Markdown Content Field / Live Split / Preview
                    Box(modifier = Modifier.heightIn(min = 320.dp).fillMaxWidth()) {
                        when (editModeTab) {
                            0 -> {
                                OutlinedTextField(
                                    value = contentState,
                                    onValueChange = { contentState = it },
                                    placeholder = { Text("Write markdown content here...") },
                                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth().heightIn(min = 320.dp)
                                )
                            }
                            1 -> {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OutlinedTextField(
                                        value = contentState,
                                        onValueChange = { contentState = it },
                                        placeholder = { Text("Markdown...") },
                                        textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth().heightIn(min = 180.dp)
                                    )
                                    Surface(
                                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth().padding(4.dp)
                                    ) {
                                        Box(modifier = Modifier.padding(14.dp)) {
                                            MarkdownRenderer(
                                                markdown = contentState,
                                                onContentChange = { updated -> contentState = updated }
                                            )
                                        }
                                    }
                                }
                            }
                            2 -> {
                                Surface(
                                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Box(modifier = Modifier.padding(16.dp)) {
                                        MarkdownRenderer(
                                            markdown = contentState,
                                            onContentChange = { updated -> contentState = updated }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showEmojiPicker) {
        EmojiPickerModal(
            currentEmoji = emojiState,
            onEmojiSelected = {
                emojiState = it
                onUpdateRowEmoji(it)
            },
            onDismiss = { showEmojiPicker = false }
        )
    }

    if (showDeleteConfirm) {
        ConfirmDeleteDialog(
            title = "Delete Document Page",
            message = "Are you sure you want to delete '${row.title.ifEmpty { "this page" }}'?",
            onConfirm = {
                onDeleteRow()
                onDismiss()
            },
            onDismiss = { showDeleteConfirm = false }
        )
    }
}

@Composable
fun MarkdownFormattingToolbar(
    onInsertMarkdown: (prefix: String, suffix: String) -> Unit
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            item {
                IconButton(onClick = { onInsertMarkdown("**", "**") }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.FormatBold, contentDescription = "Bold", modifier = Modifier.size(18.dp))
                }
            }
            item {
                IconButton(onClick = { onInsertMarkdown("*", "*") }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.FormatItalic, contentDescription = "Italic", modifier = Modifier.size(18.dp))
                }
            }
            item {
                IconButton(onClick = { onInsertMarkdown("# ", "") }, modifier = Modifier.size(32.dp)) {
                    Text("H1", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
            item {
                IconButton(onClick = { onInsertMarkdown("## ", "") }, modifier = Modifier.size(32.dp)) {
                    Text("H2", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
            item {
                IconButton(onClick = { onInsertMarkdown("### ", "") }, modifier = Modifier.size(32.dp)) {
                    Text("H3", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
            item {
                IconButton(onClick = { onInsertMarkdown("- ", "") }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.AutoMirrored.Filled.FormatListBulleted, contentDescription = "Bullet List", modifier = Modifier.size(18.dp))
                }
            }
            item {
                IconButton(onClick = { onInsertMarkdown("- [ ] ", "") }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.CheckBox, contentDescription = "Task Checkbox", modifier = Modifier.size(18.dp))
                }
            }
            item {
                IconButton(onClick = { onInsertMarkdown("> ", "") }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.FormatQuote, contentDescription = "Quote", modifier = Modifier.size(18.dp))
                }
            }
            item {
                IconButton(onClick = { onInsertMarkdown("```\n", "\n```") }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Code, contentDescription = "Code Block", modifier = Modifier.size(18.dp))
                }
            }
            item {
                IconButton(onClick = { onInsertMarkdown("[Link](", ")") }, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Link, contentDescription = "Link", modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PropertyInspectorField(
    column: ColumnSchema,
    row: RowData,
    allTables: List<TableSummary>,
    onFetchTargetRows: suspend (targetTableId: Int) -> List<RowData>,
    onUpdateProperty: (JsonElement) -> Unit
) {
    val propVal = row.properties[column.name]
    var showReferencePicker by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(0.4f)) {
            val typeIcon = when (column.type) {
                "string" -> "Aa"
                "enum" -> "v"
                "tags" -> "#"
                "reference" -> "->"
                "rollup" -> "Fx"
                "referenced" -> "Ref"
                else -> "•"
            }
            Text(text = "$typeIcon ${column.name}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
        }

        Box(modifier = Modifier.weight(0.6f)) {
            when (column.type) {
                "string" -> {
                    var strVal by remember(propVal) { mutableStateOf(propVal?.jsonPrimitive?.contentOrNull ?: "") }
                    OutlinedTextField(
                        value = strVal,
                        onValueChange = {
                            strVal = it
                            onUpdateProperty(JsonPrimitive(it))
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                "enum" -> {
                    var strVal by remember(propVal) { mutableStateOf(propVal?.jsonPrimitive?.contentOrNull ?: "") }
                    val options = remember(column.options) {
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

                    FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        options.forEach { opt ->
                            val isSelected = strVal == opt
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    strVal = opt
                                    onUpdateProperty(JsonPrimitive(opt))
                                },
                                label = { Text(opt, fontSize = 11.sp) },
                                shape = CircleShape
                            )
                        }
                    }
                }
                "tags" -> {
                    val activeTags = remember(propVal) {
                        if (propVal is JsonArray) propVal.mapNotNull { it.jsonPrimitive.contentOrNull }.toSet()
                        else emptySet()
                    }
                    val options = remember(column.options) {
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

                    FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        options.forEach { opt ->
                            val isSelected = activeTags.contains(opt)
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    val newTags = if (isSelected) activeTags - opt else activeTags + opt
                                    onUpdateProperty(buildJsonArray { newTags.forEach { add(it) } })
                                },
                                label = { Text(opt, fontSize = 11.sp) },
                                shape = CircleShape
                            )
                        }
                    }
                }
                "reference" -> {
                    val targetTable = allTables.find { it.id == column.targetTableId }
                    val linkedTitle = if (propVal is JsonObject) {
                        "${propVal["emoji"]?.jsonPrimitive?.contentOrNull ?: "🔗"} ${propVal["title"]?.jsonPrimitive?.contentOrNull ?: "Linked Row"}"
                    } else if (propVal is JsonPrimitive) {
                        "Linked ID: ${propVal.content}"
                    } else {
                        "Unlinked"
                    }

                    OutlinedButton(
                        onClick = { showReferencePicker = true },
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Link, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "$linkedTitle (${targetTable?.name ?: "Table"})", fontSize = 11.sp)
                    }

                    if (showReferencePicker && column.targetTableId != null) {
                        ReferenceRowPickerModal(
                            targetTableId = column.targetTableId,
                            targetTableName = targetTable?.name ?: "Target Table",
                            onFetchTargetRows = onFetchTargetRows,
                            onSelectRow = { selectedRow ->
                                val jsonRef = buildJsonObject {
                                    put("id", selectedRow.id)
                                    put("title", selectedRow.title)
                                    put("emoji", selectedRow.emoji ?: "📄")
                                }
                                onUpdateProperty(jsonRef)
                                showReferencePicker = false
                            },
                            onDismiss = { showReferencePicker = false }
                        )
                    }
                }
                "referenced" -> {
                    val itemsCount = if (propVal is JsonArray) propVal.size else 0
                    Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(6.dp)) {
                        Text("🔒 READONLY REF ($itemsCount linking rows)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(6.dp))
                    }
                }
                "rollup" -> {
                    Surface(color = MaterialTheme.colorScheme.tertiaryContainer, shape = RoundedCornerShape(6.dp)) {
                        Text("🧮 ${propVal?.jsonPrimitive?.contentOrNull ?: propVal.toString()}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onTertiaryContainer, modifier = Modifier.padding(6.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun ReferenceRowPickerModal(
    targetTableId: Int,
    targetTableName: String,
    onFetchTargetRows: suspend (targetTableId: Int) -> List<RowData>,
    onSelectRow: (RowData) -> Unit,
    onDismiss: () -> Unit
) {
    var rowsState by remember { mutableStateOf<List<RowData>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchFilter by remember { mutableStateOf("") }

    LaunchedEffect(targetTableId) {
        isLoading = true
        rowsState = onFetchTargetRows(targetTableId)
        isLoading = false
    }

    val filteredRows = remember(rowsState, searchFilter) {
        if (searchFilter.isBlank()) rowsState
        else rowsState.filter { it.title.contains(searchFilter, ignoreCase = true) }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Link Row from $targetTableName") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth().heightIn(max = 350.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = searchFilter,
                    onValueChange = { searchFilter = it },
                    placeholder = { Text("Search target rows...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else if (filteredRows.isEmpty()) {
                    Text("No matching rows found in $targetTableName.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                        filteredRows.forEach { r ->
                            Surface(
                                onClick = { onSelectRow(r) },
                                shape = RoundedCornerShape(6.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)
                            ) {
                                Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(r.emoji ?: "📄", fontSize = 16.sp)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(r.title.ifEmpty { "Untitled" }, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
fun MarkdownRenderer(
    markdown: String,
    onContentChange: ((String) -> Unit)? = null
) {
    if (markdown.isBlank()) {
        Text(text = "Nothing to preview.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }

    val lines = markdown.split("\n")
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        lines.forEachIndexed { lineIdx, line ->
            when {
                line.startsWith("# ") -> {
                    Text(
                        text = line.removePrefix("# "),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                line.startsWith("## ") -> {
                    Text(
                        text = line.removePrefix("## "),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
                line.startsWith("### ") -> {
                    Text(
                        text = line.removePrefix("### "),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                line.startsWith("- [ ] ") || line.startsWith("- [x] ") || line.startsWith("- [X] ") -> {
                    val isChecked = line.startsWith("- [x] ") || line.startsWith("- [X] ")
                    val taskText = line.substring(6)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = isChecked,
                            onCheckedChange = { checked ->
                                if (onContentChange != null) {
                                    val mutableLines = lines.toMutableList()
                                    mutableLines[lineIdx] = if (checked) "- [x] $taskText" else "- [ ] $taskText"
                                    onContentChange(mutableLines.joinToString("\n"))
                                }
                            },
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = taskText,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (isChecked) FontWeight.Normal else FontWeight.Medium
                        )
                    }
                }
                line.startsWith("> ") -> {
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f),
                        shape = RoundedCornerShape(topEnd = 6.dp, bottomEnd = 6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                            Box(
                                modifier = Modifier
                                    .width(4.dp)
                                    .fillMaxHeight()
                                    .background(MaterialTheme.colorScheme.primary)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = line.removePrefix("> "),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }
                }
                line.startsWith("```") -> {
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = line,
                            style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                }
                line.startsWith("- ") || line.startsWith("* ") -> {
                    Row(verticalAlignment = Alignment.Top) {
                        Text("• ", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        Text(text = line.substring(2), style = MaterialTheme.typography.bodyMedium)
                    }
                }
                else -> {
                    Text(text = line, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}
