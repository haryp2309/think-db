package com.thinkdb.app.ui.schema

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.thinkdb.app.data.model.*
import kotlinx.serialization.json.*

@Composable
fun AddColumnDialog(
    tableSchema: TableSchema,
    allTables: List<TableSummary>,
    onAddColumn: (request: AddColumnRequest) -> Unit,
    onDismiss: () -> Unit
) {
    var colName by remember { mutableStateOf("") }
    var colType by remember { mutableStateOf("string") }
    var optionsList by remember { mutableStateOf(listOf("Option 1", "Option 2")) }
    var defaultOptionIndex by remember { mutableIntStateOf(-1) }
    var targetTableId by remember { mutableStateOf<Int?>(allTables.firstOrNull { it.id != tableSchema.id }?.id) }

    var relationColumnName by remember { mutableStateOf("") }
    var targetPropertyName by remember { mutableStateOf("") }

    val availableTypes = listOf(
        "string" to "📝 String (Free-form text)",
        "enum" to "🔘 Enum (Single Select)",
        "tags" to "🏷️ Tags (Multi Select)",
        "reference" to "🔗 Reference (Many-to-One Relation)",
        "rollup" to "🧮 Rollup (Property Lookup)"
    )

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .padding(14.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Add Custom Property",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                )

                OutlinedTextField(
                    value = colName,
                    onValueChange = { colName = it },
                    label = { Text("Property Name") },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Property Type:", style = MaterialTheme.typography.labelMedium)
                Column {
                    availableTypes.forEach { (typeKey, labelStr) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { colType = typeKey },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(selected = colType == typeKey, onClick = { colType = typeKey })
                            Text(labelStr, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                when (colType) {
                    "enum", "tags" -> {
                        Text("Options (Star ⭐ to mark default):", style = MaterialTheme.typography.labelMedium)
                        optionsList.forEachIndexed { idx, opt ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                IconButton(
                                    onClick = {
                                        defaultOptionIndex = if (defaultOptionIndex == idx) -1 else idx
                                    }
                                ) {
                                    Icon(
                                        imageVector = if (defaultOptionIndex == idx) Icons.Filled.Star else Icons.Outlined.StarBorder,
                                        contentDescription = "Default Option",
                                        tint = if (defaultOptionIndex == idx) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                OutlinedTextField(
                                    value = opt,
                                    onValueChange = { newTxt ->
                                        val mutable = optionsList.toMutableList()
                                        mutable[idx] = newTxt
                                        optionsList = mutable
                                    },
                                    singleLine = true,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                )

                                IconButton(
                                    onClick = {
                                        val mutable = optionsList.toMutableList()
                                        mutable.removeAt(idx)
                                        optionsList = mutable
                                    }
                                ) {
                                    Icon(Icons.Default.Delete, contentDescription = "Remove Option", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }

                        Button(
                            onClick = {
                                optionsList = optionsList + "Option ${optionsList.size + 1}"
                            }
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Add Option")
                        }
                    }
                    "reference" -> {
                        Text("Target Table to Link To:", style = MaterialTheme.typography.labelMedium)
                        allTables.forEach { tbl ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { targetTableId = tbl.id },
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(selected = targetTableId == tbl.id, onClick = { targetTableId = tbl.id })
                                Text("${tbl.emoji} ${tbl.name}", style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                    "rollup" -> {
                        OutlinedTextField(
                            value = relationColumnName,
                            onValueChange = { relationColumnName = it },
                            label = { Text("Relation Column Name (in this table)") },
                            singleLine = true,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = targetPropertyName,
                            onValueChange = { targetPropertyName = it },
                            label = { Text("Target Property Name (in target table)") },
                            singleLine = true,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) { Text("Cancel") }
                    Button(
                        onClick = {
                            if (colName.isNotBlank()) {
                                val jsonOptionsList: List<JsonElement> = when (colType) {
                                    "enum", "tags" -> optionsList.mapIndexed { idx, optText ->
                                        if (idx == defaultOptionIndex) {
                                            buildJsonObject {
                                                put("value", optText)
                                                put("isDefault", true)
                                            }
                                        } else {
                                            JsonPrimitive(optText)
                                        }
                                    }
                                    else -> emptyList()
                                }

                                val req = AddColumnRequest(
                                    name = colName.trim(),
                                    type = colType,
                                    options = jsonOptionsList,
                                    targetTableId = targetTableId,
                                    relationColumnName = relationColumnName.ifBlank { null },
                                    targetPropertyName = targetPropertyName.ifBlank { null }
                                )
                                onAddColumn(req)
                                onDismiss()
                            }
                        }
                    ) {
                        Text("Add Property")
                    }
                }
            }
        }
    }
}
