package com.thinkdb.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thinkdb.app.data.model.*

@Composable
fun Sidebar(
    namespaces: List<Namespace>,
    tables: List<TableSummary>,
    viewsMap: Map<Int, List<ViewSchema>>,
    selectedTableId: Int?,
    selectedViewId: Int?,
    onSelectView: (tableId: Int, viewId: Int) -> Unit,
    onToggleNamespaceCollapse: (nsId: Int, isCollapsed: Boolean) -> Unit,
    onCreateNamespace: (name: String, emoji: String) -> Unit,
    onUpdateNamespace: (nsId: Int, name: String, emoji: String) -> Unit,
    onDeleteNamespace: (nsId: Int) -> Unit,
    onCreateTable: (namespaceId: Int, name: String, emoji: String) -> Unit,
    onUpdateTable: (tableId: Int, name: String, emoji: String, namespaceId: Int?) -> Unit,
    onDeleteTable: (tableId: Int) -> Unit,
    onCreateView: (tableId: Int, name: String, emoji: String, type: String) -> Unit,
    onReorderViews: (tableId: Int, viewIds: List<Int>) -> Unit,
    onDeleteView: (viewId: Int) -> Unit,
    onCloseDrawer: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var showCreateNsDialog by remember { mutableStateOf(false) }
    var nsToEdit by remember { mutableStateOf<Namespace?>(null) }
    var nsToDelete by remember { mutableStateOf<Namespace?>(null) }

    var tableNsForCreate by remember { mutableStateOf<Int?>(null) }
    var tableToEdit by remember { mutableStateOf<TableSummary?>(null) }
    var tableToDelete by remember { mutableStateOf<TableSummary?>(null) }

    var viewTableForCreate by remember { mutableStateOf<Int?>(null) }
    var viewToDelete by remember { mutableStateOf<ViewSchema?>(null) }

    Surface(
        color = MaterialTheme.colorScheme.surface,
        modifier = modifier
            .fillMaxHeight()
            .width(310.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 14.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "🚀", fontSize = 22.sp)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "ThinkDB Workspace",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Minimalist Database Engine",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { showCreateNsDialog = true },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "New Namespace", modifier = Modifier.size(18.dp))
                    }
                    if (onCloseDrawer != null) {
                        Spacer(modifier = Modifier.width(2.dp))
                        IconButton(onClick = onCloseDrawer, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Close Drawer", modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))

            Spacer(modifier = Modifier.height(10.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(namespaces, key = { it.id }) { ns ->
                    val nsTables = tables.filter { it.namespaceId == ns.id }

                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(6.dp))
                                .clickable { onToggleNamespaceCollapse(ns.id, !ns.isCollapsed) }
                                .padding(vertical = 6.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                Icon(
                                    imageVector = if (ns.isCollapsed) Icons.AutoMirrored.Filled.KeyboardArrowRight else Icons.Default.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(text = ns.emoji, fontSize = 15.sp)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = ns.name.uppercase(),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.8.sp
                                )
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { tableNsForCreate = ns.id },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = "Add Table", modifier = Modifier.size(14.dp))
                                }
                                IconButton(
                                    onClick = { nsToEdit = ns },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Default.Edit, contentDescription = "Edit Namespace", modifier = Modifier.size(12.dp))
                                }
                                if (namespaces.size > 1) {
                                    IconButton(
                                        onClick = { nsToDelete = ns },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete Namespace", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(12.dp))
                                    }
                                }
                            }
                        }

                        AnimatedVisibility(
                            visible = !ns.isCollapsed,
                            enter = expandVertically() + fadeIn(),
                            exit = shrinkVertically() + fadeOut()
                        ) {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(2.dp),
                                modifier = Modifier.padding(start = 12.dp, top = 2.dp)
                            ) {
                                nsTables.forEach { table ->
                                    val tableViews = viewsMap[table.id] ?: emptyList()
                                    val isTableSelected = selectedTableId == table.id

                                    Surface(
                                        color = if (isTableSelected) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f) else MaterialTheme.colorScheme.surface,
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(vertical = 4.dp, horizontal = 6.dp)) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clip(RoundedCornerShape(6.dp))
                                                    .clickable {
                                                        val defaultView = tableViews.firstOrNull { it.isDefault } ?: tableViews.firstOrNull()
                                                        if (defaultView != null) {
                                                            onSelectView(table.id, defaultView.id)
                                                            onCloseDrawer?.invoke()
                                                        }
                                                    }
                                                    .padding(horizontal = 6.dp, vertical = 6.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                                    Text(text = table.emoji, fontSize = 16.sp)
                                                    Spacer(modifier = Modifier.width(8.dp))
                                                    Text(
                                                        text = table.name,
                                                        style = MaterialTheme.typography.bodyMedium,
                                                        fontWeight = if (isTableSelected) FontWeight.Bold else FontWeight.SemiBold
                                                    )
                                                }

                                                Row {
                                                    IconButton(onClick = { viewTableForCreate = table.id }, modifier = Modifier.size(22.dp)) {
                                                        Icon(Icons.Default.Add, contentDescription = "Add View", modifier = Modifier.size(12.dp))
                                                    }
                                                    IconButton(onClick = { tableToEdit = table }, modifier = Modifier.size(22.dp)) {
                                                        Icon(Icons.Default.Edit, contentDescription = "Edit Table", modifier = Modifier.size(12.dp))
                                                    }
                                                    IconButton(onClick = { tableToDelete = table }, modifier = Modifier.size(22.dp)) {
                                                        Icon(Icons.Default.Delete, contentDescription = "Delete Table", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(12.dp))
                                                    }
                                                }
                                            }

                                            tableViews.forEachIndexed { idx, view ->
                                                val isViewSelected = selectedTableId == table.id && selectedViewId == view.id

                                                Surface(
                                                    color = if (isViewSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f) else MaterialTheme.colorScheme.surface,
                                                    shape = RoundedCornerShape(6.dp),
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .padding(start = 16.dp, top = 2.dp, bottom = 2.dp)
                                                        .clickable {
                                                            onSelectView(table.id, view.id)
                                                            onCloseDrawer?.invoke()
                                                        }
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        horizontalArrangement = Arrangement.SpaceBetween
                                                    ) {
                                                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                                            Text(text = view.emoji, fontSize = 14.sp)
                                                            Spacer(modifier = Modifier.width(6.dp))
                                                            Text(
                                                                text = view.name,
                                                                style = MaterialTheme.typography.bodySmall,
                                                                fontWeight = if (isViewSelected) FontWeight.Bold else FontWeight.Normal
                                                            )
                                                            if (view.isDefault) {
                                                                Spacer(modifier = Modifier.width(4.dp))
                                                                Text("• Default", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                                                            }
                                                        }

                                                        Row {
                                                            if (idx > 0) {
                                                                IconButton(
                                                                    onClick = {
                                                                        val list = tableViews.map { it.id }.toMutableList()
                                                                        val tmp = list[idx]; list[idx] = list[idx - 1]; list[idx - 1] = tmp
                                                                        onReorderViews(table.id, list)
                                                                    },
                                                                    modifier = Modifier.size(18.dp)
                                                                ) {
                                                                    Icon(Icons.Default.ArrowUpward, contentDescription = null, modifier = Modifier.size(10.dp))
                                                                }
                                                            }
                                                            if (idx < tableViews.size - 1) {
                                                                IconButton(
                                                                    onClick = {
                                                                        val list = tableViews.map { it.id }.toMutableList()
                                                                        val tmp = list[idx]; list[idx] = list[idx + 1]; list[idx + 1] = tmp
                                                                        onReorderViews(table.id, list)
                                                                    },
                                                                    modifier = Modifier.size(18.dp)
                                                                ) {
                                                                    Icon(Icons.Default.ArrowDownward, contentDescription = null, modifier = Modifier.size(10.dp))
                                                                }
                                                            }
                                                            if (tableViews.size > 1) {
                                                                IconButton(
                                                                    onClick = { viewToDelete = view },
                                                                    modifier = Modifier.size(18.dp)
                                                                ) {
                                                                    Icon(Icons.Default.Close, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(10.dp))
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Dialogs
    if (showCreateNsDialog) {
        NameEmojiDialog(
            title = "New Namespace",
            initialName = "",
            initialEmoji = "📁",
            onConfirm = { name, emoji ->
                onCreateNamespace(name, emoji)
                showCreateNsDialog = false
            },
            onDismiss = { showCreateNsDialog = false }
        )
    }

    nsToEdit?.let { ns ->
        NameEmojiDialog(
            title = "Edit Namespace",
            initialName = ns.name,
            initialEmoji = ns.emoji,
            onConfirm = { name, emoji ->
                onUpdateNamespace(ns.id, name, emoji)
                nsToEdit = null
            },
            onDismiss = { nsToEdit = null }
        )
    }

    nsToDelete?.let { ns ->
        ConfirmDeleteDialog(
            title = "Delete Namespace",
            message = "Are you sure you want to delete namespace '${ns.name}'?",
            onConfirm = { onDeleteNamespace(ns.id) },
            onDismiss = { nsToDelete = null }
        )
    }

    tableNsForCreate?.let { nsId ->
        NameEmojiDialog(
            title = "New Table",
            initialName = "",
            initialEmoji = "📁",
            onConfirm = { name, emoji ->
                onCreateTable(nsId, name, emoji)
                tableNsForCreate = null
            },
            onDismiss = { tableNsForCreate = null }
        )
    }

    tableToEdit?.let { table ->
        EditTableDialog(
            table = table,
            namespaces = namespaces,
            onConfirm = { name, emoji, nsId ->
                onUpdateTable(table.id, name, emoji, nsId)
                tableToEdit = null
            },
            onDismiss = { tableToEdit = null }
        )
    }

    tableToDelete?.let { table ->
        ConfirmDeleteDialog(
            title = "Delete Table",
            message = "Are you sure you want to delete table '${table.name}'?",
            onConfirm = { onDeleteTable(table.id) },
            onDismiss = { tableToDelete = null }
        )
    }

    viewTableForCreate?.let { tableId ->
        CreateViewDialog(
            onConfirm = { name, emoji, type ->
                onCreateView(tableId, name, emoji, type)
                viewTableForCreate = null
            },
            onDismiss = { viewTableForCreate = null }
        )
    }

    viewToDelete?.let { view ->
        ConfirmDeleteDialog(
            title = "Delete View",
            message = "Are you sure you want to delete view '${view.name}'?",
            onConfirm = { onDeleteView(view.id) },
            onDismiss = { viewToDelete = null }
        )
    }
}

@Composable
fun NameEmojiDialog(
    title: String,
    initialName: String,
    initialEmoji: String,
    onConfirm: (name: String, emoji: String) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(initialName) }
    var emoji by remember { mutableStateOf(initialEmoji) }
    var showEmojiPicker by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Emoji: ")
                    Button(onClick = { showEmojiPicker = true }) {
                        Text(text = emoji, fontSize = 20.sp)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank()) onConfirm(name.trim(), emoji)
                }
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )

    if (showEmojiPicker) {
        EmojiPickerModal(
            currentEmoji = emoji,
            onEmojiSelected = { emoji = it },
            onDismiss = { showEmojiPicker = false }
        )
    }
}

@Composable
fun EditTableDialog(
    table: TableSummary,
    namespaces: List<Namespace>,
    onConfirm: (name: String, emoji: String, namespaceId: Int?) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(table.name) }
    var emoji by remember { mutableStateOf(table.emoji) }
    var selectedNsId by remember { mutableStateOf(table.namespaceId) }
    var showEmojiPicker by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Table") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Table Name") },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Emoji: ")
                    Button(onClick = { showEmojiPicker = true }) {
                        Text(text = emoji, fontSize = 20.sp)
                    }
                }

                Text("Namespace:", style = MaterialTheme.typography.labelMedium)
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    namespaces.forEach { ns ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedNsId = ns.id }
                        ) {
                            RadioButton(selected = selectedNsId == ns.id, onClick = { selectedNsId = ns.id })
                            Text("${ns.emoji} ${ns.name}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank()) onConfirm(name.trim(), emoji, selectedNsId)
                }
            ) {
                Text("Save Changes")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )

    if (showEmojiPicker) {
        EmojiPickerModal(
            currentEmoji = emoji,
            onEmojiSelected = { emoji = it },
            onDismiss = { showEmojiPicker = false }
        )
    }
}

@Composable
fun CreateViewDialog(
    onConfirm: (name: String, emoji: String, type: String) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var emoji by remember { mutableStateOf("📋") }
    var type by remember { mutableStateOf("grid") }
    var showEmojiPicker by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New View") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("View Name") },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Emoji: ")
                    Button(onClick = { showEmojiPicker = true }) {
                        Text(text = emoji, fontSize = 18.sp)
                    }
                }

                Text("Layout Type:", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = type == "grid",
                        onClick = { type = "grid" },
                        label = { Text("📋 Grid Table") }
                    )
                    FilterChip(
                        selected = type == "kanban",
                        onClick = { type = "kanban" },
                        label = { Text("⚡ Kanban Board") }
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank()) onConfirm(name.trim(), emoji, type)
                }
            ) {
                Text("Create View")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )

    if (showEmojiPicker) {
        EmojiPickerModal(
            currentEmoji = emoji,
            onEmojiSelected = { emoji = it },
            onDismiss = { showEmojiPicker = false }
        )
    }
}
