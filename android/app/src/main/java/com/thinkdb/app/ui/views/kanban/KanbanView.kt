package com.thinkdb.app.ui.views.kanban

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thinkdb.app.data.model.*
import com.thinkdb.app.ui.views.grid.RenderPropertyBadge
import kotlinx.serialization.json.*

@Composable
fun KanbanView(
    tableSchema: TableSchema,
    viewSchema: ViewSchema,
    rows: List<RowData>,
    onOpenRowInspector: (RowData) -> Unit,
    onCreateCardInColumn: (columnValue: String) -> Unit,
    onMoveCardToColumn: (rowId: Int, newColumnValue: String) -> Unit,
    onUpdateRowTitle: (rowId: Int, newTitle: String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    val groupCol = tableSchema.columns.find { it.id == viewSchema.groupByColumnId }

    if (groupCol == null) {
        Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                text = "Kanban view requires selecting a Grouping Column (Enum or Tags). Please select one in the toolbar.",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(24.dp)
            )
        }
        return
    }

    val optionsList = remember(groupCol.options) {
        val list = mutableListOf<String>()
        val optJson = groupCol.options
        if (optJson is JsonArray) {
            optJson.forEach { elem ->
                if (elem is JsonPrimitive) list.add(elem.content)
                else if (elem is JsonObject) elem["value"]?.jsonPrimitive?.contentOrNull?.let { list.add(it) }
            }
        }
        if (list.isEmpty()) list.addAll(listOf("To Do", "In Progress", "Done"))
        list.add("Unassigned")
        list.distinct()
    }

    val columnsMap = remember(rows, groupCol.name) {
        val map = optionsList.associateWith { mutableListOf<RowData>() }.toMutableMap()
        rows.forEach { row ->
            val jsonVal = row.properties[groupCol.name]
            val valStr = when (jsonVal) {
                is JsonPrimitive -> jsonVal.content
                is JsonArray -> jsonVal.firstOrNull()?.jsonPrimitive?.contentOrNull ?: "Unassigned"
                else -> "Unassigned"
            }
            val key = if (map.containsKey(valStr)) valStr else "Unassigned"
            map.getOrPut(key) { mutableListOf() }.add(row)
        }
        map
    }

    Row(
        modifier = modifier
            .fillMaxSize()
            .horizontalScroll(scrollState)
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        optionsList.forEach { colValue ->
            val columnCards = columnsMap[colValue] ?: emptyList()

            KanbanColumn(
                columnTitle = colValue,
                cards = columnCards,
                tableSchema = tableSchema,
                cardProperties = viewSchema.cardProperties,
                allColumnOptions = optionsList,
                onOpenInspector = onOpenRowInspector,
                onAddCard = { onCreateCardInColumn(colValue) },
                onMoveCard = { rowId, newColVal -> onMoveCardToColumn(rowId, newColVal) },
                onUpdateTitle = onUpdateRowTitle,
                modifier = Modifier.width(280.dp)
            )
        }
    }
}

@Composable
fun KanbanColumn(
    columnTitle: String,
    cards: List<RowData>,
    tableSchema: TableSchema,
    cardProperties: List<String>,
    allColumnOptions: List<String>,
    onOpenInspector: (RowData) -> Unit,
    onAddCard: () -> Unit,
    onMoveCard: (rowId: Int, newColumnValue: String) -> Unit,
    onUpdateTitle: (rowId: Int, newTitle: String) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
        shape = RoundedCornerShape(10.dp),
        modifier = modifier.fillMaxHeight()
    ) {
        Column(
            modifier = Modifier
                .padding(10.dp)
                .fillMaxSize()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = columnTitle,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = CircleShape
                    ) {
                        Text(
                            text = "${cards.size}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }

                IconButton(
                    onClick = onAddCard,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Card", modifier = Modifier.size(16.dp))
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(cards, key = { it.id }) { card ->
                    KanbanCardItem(
                        card = card,
                        tableSchema = tableSchema,
                        cardProperties = cardProperties,
                        allColumnOptions = allColumnOptions,
                        currentColumnValue = columnTitle,
                        onOpenInspector = { onOpenInspector(card) },
                        onMoveCard = { newColVal -> onMoveCard(card.id, newColVal) },
                        onUpdateTitle = { newTitle -> onUpdateTitle(card.id, newTitle) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            OutlinedButton(
                onClick = onAddCard,
                shape = RoundedCornerShape(6.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("New Card", fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun KanbanCardItem(
    card: RowData,
    tableSchema: TableSchema,
    cardProperties: List<String>,
    allColumnOptions: List<String>,
    currentColumnValue: String,
    onOpenInspector: () -> Unit,
    onMoveCard: (String) -> Unit,
    onUpdateTitle: (String) -> Unit
) {
    var titleText by remember(card.title) { mutableStateOf(card.title) }
    var showMoveMenu by remember { mutableStateOf(false) }

    val visibleProps = cardProperties.ifEmpty {
        listOf("title", "content") + tableSchema.columns.map { it.name }
    }

    Surface(
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(8.dp),
        shadowElevation = 1.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenInspector() }
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    if (!card.emoji.isNullOrBlank()) {
                        Text(text = card.emoji, fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(
                        text = titleText.ifEmpty { "Untitled" },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2,
                        modifier = Modifier.weight(1f)
                    )
                }

                Box {
                    IconButton(
                        onClick = { showMoveMenu = true },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.MoreVert, contentDescription = null, modifier = Modifier.size(16.dp))
                    }

                    DropdownMenu(
                        expanded = showMoveMenu,
                        onDismissRequest = { showMoveMenu = false }
                    ) {
                        Text(
                            text = "Move to Column:",
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                        allColumnOptions.filter { it != currentColumnValue }.forEach { targetCol ->
                            DropdownMenuItem(
                                text = { Text(targetCol) },
                                onClick = {
                                    onMoveCard(targetCol)
                                    showMoveMenu = false
                                }
                            )
                        }
                    }
                }
            }

            if (visibleProps.contains("content") && card.content.isNotBlank()) {
                Text(
                    text = card.content,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2
                )
            }

            tableSchema.columns.forEach { col ->
                if (visibleProps.contains(col.name)) {
                    val propVal = card.properties[col.name]
                    if (propVal != null && propVal !is JsonNull) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "${col.name}: ", style = MaterialTheme.typography.labelSmall)
                            RenderPropertyBadge(column = col, value = propVal, onUpdateValue = {})
                        }
                    }
                }
            }
        }
    }
}
