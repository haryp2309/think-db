# Project Management Database App: Technical Specification

## 1. Executive Summary & Core Requirements

This specification outlines the architecture, database design, functional requirements, and API contracts for a flexible project management database system (ThinkDB). The system features a Notion-style dynamic database engine supporting interactive Grid and Kanban board views, real-time bidirectional cross-table references, customizable property schemas, view-level filtering/sorting/grouping, batch row operations, and high-performance CSV data export.

### 1.1 Key Functional Requirements
* **Dynamic Database Schema**: Users can create tables on the fly with customizable names and Unicode emojis (e.g. 📁, 🚀, 👤).
* **Default Column Set**: Every created table automatically includes:
  * `id` (Auto-incrementing primary key)
  * `title` (Short row identifier/name)
  * `content` (Markdown formatted body text)
  * `created_at` (Timestamp with timezone)
  * `updated_at` (Timestamp with timezone)
* **Custom Property Types**: Support for `string`, `enum` (single select), `tags` (multi-select), `reference` (Many-to-One relation to another table row), `rollup` (Notion-style property lookup from relation), and `referenced` (read-only inverse aggregated relation).
* **Many-to-One Relations & Aggregated Inverse Column**: Assigning a relation from Table A to Table B allows multiple rows in Table A to relate to the same target row in Table B. The target table (Table B) automatically receives an aggregated read-only inverse relation column displaying all linking rows.
* **Multiple Configurable Views per Table**: Tables support multiple saved views (Grid, Kanban Board) with custom names and emojis (e.g. 📋, ⚡, 🐞).
* **Filtering, Sorting & Grouping**: Each view maintains filter rules (`equals`, `contains`, `not_equals`), sorting criteria (property name, `asc`/`desc`), view-level grouping column, and visible column preferences (`card_properties`).
* **Manual View Save/Discard UX**: View configuration changes (filters, sorts, grouping, layout) are held in working state until explicitly saved or discarded via a "Save View" / "Discard Changes" toolbar banner. Row data edits auto-save immediately.
* **Real-Time Data Persistence**: All row edits (title, property values, markdown content, kanban card reordering) auto-save instantly to the database.
* **Notion-Style Live Markdown Preview**: Live split or tabbed markdown editor and preview while typing.
* **High-Performance CSV Export**: Server-side CSV streaming using Polars for memory efficiency and custom column/row filtering.

### 1.2 Technology Stack

| Layer | Technology / Framework | Purpose |
| :--- | :--- | :--- |
| **Web Frontend** | React 18 / Vite / TypeScript | Modern SPA user interface and state management |
| **Android App** | Kotlin / Jetpack Compose / Material 3 / Coroutines / Flow | Native Android UI following Material You guidelines |
| **Styling & Design** | Tailwind CSS / Compose Material 3 | Responsive layout, dark/light theme switching, and smooth micro-animations |
| **Backend API** | Python 3.12+ / FastAPI | Thin REST gateway, route handling, Pydantic validation, and data orchestration |
| **Database ORM** | Tortoise ORM (`tortoise-orm`) | Async ORM with pluggable backends (`SQLite` for testing/dev, `PostgreSQL` for production) |
| **Data Engine & Export** | Polars (`polars`) | Fast in-memory data transformation and streamed CSV file generation |

---

## 2. UX & Interactive Features Specification

### 2.1 Custom Unicode Emoji Support
All emoji selectors across the application accept **any Unicode emoji** (including multi-codepoint grapheme clusters such as 🧑‍💻), supported via a free-text emoji input alongside quick-pick presets.

### 2.2 Property Schema Editing & Default Values
Custom properties can be edited post-creation—allowing users to update column names, property types, options, default values, and target reference tables. Option definitions support designating a **default value** (`isDefault: true`). When creating a new row without specifying property values, the engine automatically populates configured default values.

### 2.3 Comprehensive View Grouping Semantics
Row grouping is configured at the view level (`group_by_column_id`):
* **Grid View (`type: "grid"`)**:
  * When `group_by_column_id` is `null`, rows render in a flat list under "All Items".
  * When `group_by_column_id` is set to an `enum` or `tags` column, rows group into expandable section headers (`Group: <Value> (<Count>)`).
  * Group sections are formed by the column's configured `options` plus an "Unassigned" section for rows with missing/null values.
  * Multi-select `tags` rows appear in every group section matching one of their tags.
  * Each group section header includes a collapsible toggle (`ChevronRight` / `ChevronDown`) and an **"Add row in [Group]"** button.
* **Kanban View (`type: "kanban"`)**:
  * Grouping column is required. It defaults to `group_by_column_id` or the first available `enum`/`tags` column in the table schema.
  * If no `enum` or `tags` column exists in the table, Kanban view displays a "No Groupable Property Found" state.
  * Board columns represent option values (and "Unassigned").
  * Moving a card between Kanban columns updates the row's group property value immediately in the database.
  * Each column footer provides an **"Add card"** button.

### 2.4 Context-Aware Row Creation & Seeding
When creating a new row:
1. **Group Context Seeding**: Clicking **"Add card"** in a Kanban column or **"New row in [Group]"** in Grid view passes seed properties `{[group_column.name]: group_value}` to `createRow`.
2. **Filter Seeding**: If created without explicit group seeding, the app inspects `workingFilterConfig`. Any filter rule with `operator === 'equals'` and non-empty `value` is automatically seeded into the new row's properties.
3. **Default Value Fallback**: The backend schema builder automatically populates any missing column properties with their configured `default_value`.

### 2.5 Single Unified Group-By Specifier
A single view-level Group-By control in the toolbar dictates row grouping for Grid views and board columns for Kanban views. Grid views support optional grouping or flat lists ("No Grouping"), whereas Kanban board views require a valid `enum` or `tags` grouping column.

### 2.6 Configurable & Persisted View Properties (`card_properties`)
Views maintain a `card_properties` array stored in `system_meta_views`. This array specifies which property columns (and the `content` markdown snippet) are visible in Grid tables and Kanban cards. Users can toggle properties on/off or reorder them.

### 2.7 Manual View Save/Discard UX
View settings (`filter_config`, `sort_config`, `group_by_column_id`, `type`, `card_properties`) are modified in local workspace state. If local working state differs from the saved `activeView`, an unsaved changes banner appears displaying **"Save View"** (issues `PATCH /api/v1/views/{id}`) and **"Discard Changes"** (resets working state). Row data edits auto-save immediately.

### 2.8 Namespaces, Tables & View Subpages Hierarchy
The navigation sidebar features a 3-tier hierarchy:
1. **Namespaces**: Collapsible workspace folders stored in `system_meta_namespaces`. Clicking a namespace header toggles its `is_collapsed` state, which is saved to the database (`PATCH /api/v1/namespaces/{id}`).
2. **Tables**: Unindented database tables under namespaces. Tables can be moved to another namespace (`PATCH /api/v1/tables/{id}` `{ namespace_id }`).
3. **View Subpages**: Nested view subpages under each table (e.g. 📋 All Items, 🚀 Kanban Board). Views can be reordered via `POST /api/v1/tables/{table_id}/views/reorder`. The view at position 0 automatically receives `is_default = true`.

### 2.9 Batch Property Editing
Selecting multiple rows via checkboxes activates a batch toolbar. Users can select any property (`title`, `string`, `enum`, `tags`, `reference`) and apply a new value across all selected rows simultaneously in a single atomic API call (`PATCH /api/v1/tables/{table_id}/rows/batch`).

### 2.10 Centered Document Inspector & Pure Markdown Storage
Opening a row presents a document inspector modal. Document body text is edited as pure Markdown text with debounced auto-saving (1000ms delay) to prevent redundant network requests.

---

## 3. Database Architecture & Schema Design

Data is strictly separated into two database schemas:
1. `system_meta`: Schema metadata for namespaces, tables, custom properties, saved views, and explicit relations.
2. `app_data`: User rows and dynamic table data.

### 3.1 Metadata Tables (`system_meta`)

#### `system_meta_namespaces`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key Auto-increment | Unique namespace ID |
| `name` | TEXT | NOT NULL | Namespace display name |
| `emoji` | TEXT | DEFAULT '📁' | Unicode emoji icon |
| `is_collapsed` | BOOLEAN | DEFAULT FALSE | Collapsed state in sidebar |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `system_meta_tables`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key Auto-increment | Unique table ID |
| `name` | TEXT | NOT NULL | Table display name |
| `emoji` | TEXT | DEFAULT '📁' | Unicode emoji icon |
| `title_alias` | TEXT | DEFAULT 'Title' | Visual alias for `title` column |
| `physical_table_name` | TEXT | UNIQUE NOT NULL | SQL table identifier (`table_<id>`) |
| `namespace_id` | INTEGER | REFERENCES namespaces(id) ON DELETE SET NULL | Parent namespace ID |
| `kanban_group_column_id` | INTEGER | REFERENCES columns(id) ON DELETE SET NULL | Legacy kanban group column ID |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `system_meta_views`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key Auto-increment | Unique view ID |
| `table_id` | INTEGER | REFERENCES tables(id) ON DELETE CASCADE | Parent table ID |
| `name` | TEXT | NOT NULL | View display name |
| `emoji` | TEXT | DEFAULT '📋' | Unicode emoji icon |
| `type` | TEXT | DEFAULT 'grid' | View layout type: `'grid'` or `'kanban'` |
| `filter_config` | JSON | DEFAULT '[]' | Filter rules JSON array |
| `sort_config` | JSON | DEFAULT '[]' | Sort rules JSON array |
| `group_by_column_id` | INTEGER | REFERENCES columns(id) ON DELETE SET NULL | View grouping column ID |
| `visible_columns` | JSON | DEFAULT '[]' | Column visibility list |
| `card_properties` | JSON | DEFAULT '[]' | Ordered visible property names |
| `is_default` | BOOLEAN | DEFAULT FALSE | Default view flag |
| `position` | INTEGER | DEFAULT 0 | View order index |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `system_meta_columns`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key Auto-increment | Unique column ID |
| `table_id` | INTEGER | REFERENCES tables(id) ON DELETE CASCADE | Parent table ID |
| `name` | TEXT | NOT NULL | Property display name |
| `physical_column_name` | TEXT | NOT NULL | SQL column name (`col_<id>`) |
| `type` | TEXT | NOT NULL | Property type: `'string'`, `'enum'`, `'tags'`, `'reference'`, `'rollup'` |
| `options` | JSON | DEFAULT '[]' | Options array with `isDefault` flags or rollup config |
| `target_table_id` | INTEGER | REFERENCES tables(id) ON DELETE SET NULL | Relation/rollup target table ID |

---

## 4. Complete API Reference

### 4.1 Namespaces API
- `GET /api/v1/namespaces` — Returns `{ "namespaces": [ NamespaceSchema, ... ] }`.
- `POST /api/v1/namespaces` — Body: `{ "name": "...", "emoji": "📁" }`. Returns `NamespaceSchema`.
- `PATCH /api/v1/namespaces/{id}` — Body: `{ "name": "...", "emoji": "...", "is_collapsed": bool }`. Returns `NamespaceSchema`.
- `DELETE /api/v1/namespaces/{id}` — Drops namespace. Returns `{ "message": "..." }`.

### 4.2 Tables API
- `GET /api/v1/tables` — Returns `{ "tables": [ TableSummary, ... ] }`.
- `POST /api/v1/tables` — Body: `{ "name": "...", "emoji": "📁", "title_alias": "Title", "namespace_id": null }`. Returns `TableSchema`.
- `GET /api/v1/tables/{table_id}` — Returns `TableSchema` with columns and views.
- `PATCH /api/v1/tables/{table_id}` — Body: `{ "name": "...", "emoji": "...", "title_alias": "...", "kanban_group_column_id": null, "namespace_id": null }`. Returns `TableSchema`.
- `DELETE /api/v1/tables/{table_id}` — Drops table and dynamic schema.

### 4.3 Views API
- `GET /api/v1/tables/{table_id}/views` — Returns `{ "views": [ ViewSchema, ... ] }`.
- `POST /api/v1/tables/{table_id}/views` — Body: `CreateViewRequest`. Returns `ViewSchema`.
- `PATCH /api/v1/views/{view_id}` — Body: `UpdateViewRequest`. Returns `ViewSchema`.
- `POST /api/v1/tables/{table_id}/views/reorder` — Body: `{ "view_ids": [ 1, 2, 3 ] }`. Returns `{ "views": [ ViewSchema, ... ] }`.
- `DELETE /api/v1/views/{view_id}` — Deletes view.

### 4.4 Columns Schema API
- `POST /api/v1/tables/{table_id}/columns` — Body: `{ "name": "...", "type": "...", "options": [...], "target_table_id": null, "relation_column_name": null, "target_property_name": null }`. Returns `{ "added_column": ..., "table_schema": ... }`.
- `PATCH /api/v1/tables/{table_id}/columns/{column_id}` — Body: `{ "name": "...", "options": [...], "target_table_id": null }`. Returns `{ "updated_column": ..., "table_schema": ... }`.
- `DELETE /api/v1/tables/{table_id}/columns/{column_id}` — Deletes column. Returns `{ "message": "...", "table_schema": ... }`.

### 4.5 Row CRUD & Batch API
- `GET /api/v1/tables/{table_id}/rows?limit=100&offset=0&search=...` — Returns `RowsResponse` (`{ "table_id": 1, "table_name": "...", "total": N, "limit": 100, "offset": 0, "rows": [ RowItem, ... ] }`).
- `POST /api/v1/tables/{table_id}/rows` — Body: `{ "title": "...", "content": "...", "emoji": "...", "properties": { ... } }`. Returns `RowItem`.
- `GET /api/v1/tables/{table_id}/rows/{row_id}` — Returns single `RowItem`.
- `PATCH /api/v1/tables/{table_id}/rows/{row_id}` — Body: `{ "title": "...", "content": "...", "emoji": "...", "properties": { ... } }`. Returns `RowItem`.
- `PATCH /api/v1/tables/{table_id}/rows/batch` — Body: `{ "row_ids": [ 1, 2 ], "title": "...", "properties": { ... } }`. Returns `[ RowItem, ... ]`.
- `DELETE /api/v1/tables/{table_id}/rows/{row_id}` — Deletes row.

### 4.6 Polars CSV Export API
- `POST /api/v1/export/csv` — Body: `{ "table_id": 1, "selected_columns": [ "id", "title", "Status" ], "selected_row_ids": [ 1, 2 ] }`. Returns streamed `text/csv` attachment file.