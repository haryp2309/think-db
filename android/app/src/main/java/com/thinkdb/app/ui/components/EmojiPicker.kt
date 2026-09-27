package com.thinkdb.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

val EMOJI_PRESETS = listOf(
    "📁", "🚀", "👤", "📋", "⚡", "🐞", "🎯", "📄", "🐛", "🧑‍💻",
    "⚙️", "📊", "💡", "🔥", "📌", "🎨", "🔒", "⭐", "✅", "🎉"
)

@Composable
fun EmojiPickerModal(
    currentEmoji: String,
    onEmojiSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var textInput by remember { mutableStateOf(currentEmoji) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Choose Unicode Emoji",
                    style = MaterialTheme.typography.titleMedium
                )

                Text(text = "Presets", style = MaterialTheme.typography.labelSmall)
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(EMOJI_PRESETS) { emoji ->
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(
                                    if (emoji == currentEmoji) MaterialTheme.colorScheme.primaryContainer
                                    else MaterialTheme.colorScheme.surfaceVariant
                                )
                                .clickable {
                                    onEmojiSelected(emoji)
                                    onDismiss()
                                }
                        ) {
                            Text(text = emoji, fontSize = 20.sp)
                        }
                    }
                }

                OutlinedTextField(
                    value = textInput,
                    onValueChange = { textInput = it },
                    label = { Text("Custom Emoji / Grapheme Cluster") },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            if (textInput.isNotBlank()) {
                                onEmojiSelected(textInput.trim())
                                onDismiss()
                            }
                        }
                    ) {
                        Text("Select")
                    }
                }
            }
        }
    }
}
