from datetime import datetime, timezone
from typing import Any

from tortoise import fields, models


def utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SystemMetaNamespace(models.Model):
    id = fields.IntField(primary_key=True)
    name = fields.CharField(max_length=255)
    emoji = fields.CharField(max_length=50, default="📁", null=True)
    is_collapsed = fields.IntField(default=0, null=True)
    created_at = fields.CharField(max_length=100, null=True, default=utc_iso_now)
    updated_at = fields.CharField(max_length=100, null=True, default=utc_iso_now)

    tables: fields.ReverseRelation["SystemMetaTable"]

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        table = "system_meta_namespaces"


class SystemMetaTable(models.Model):
    id = fields.IntField(primary_key=True)
    name = fields.CharField(max_length=255)
    emoji = fields.CharField(max_length=50, default="📁", null=True)
    title_alias = fields.CharField(max_length=255, default="Title", null=True)
    physical_table_name = fields.CharField(max_length=255, unique=True, db_index=True)
    namespace_id: int | None
    namespace: Any = fields.ForeignKeyField(  # pyright: ignore[reportUnknownVariableType]
        "models.SystemMetaNamespace",
        related_name="tables",
        on_delete=fields.SET_NULL,
        null=True,
        db_column="namespace_id",
    )
    kanban_group_column_id = fields.IntField(null=True)
    created_at = fields.CharField(max_length=100, null=True, default=utc_iso_now)
    updated_at = fields.CharField(max_length=100, null=True, default=utc_iso_now)

    columns: fields.ReverseRelation["SystemMetaColumn"]
    views: fields.ReverseRelation["SystemMetaView"]

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        table = "system_meta_tables"


class SystemMetaColumn(models.Model):
    id = fields.IntField(primary_key=True)
    table_id: int
    table: Any = fields.ForeignKeyField(  # pyright: ignore[reportUnknownVariableType]
        "models.SystemMetaTable",
        related_name="columns",
        on_delete=fields.CASCADE,
        db_column="table_id",
    )
    name = fields.CharField(max_length=255)
    physical_column_name = fields.CharField(max_length=255)
    type = fields.CharField(max_length=50)
    options = fields.TextField(default="[]", null=True)
    target_table_id: int | None
    target_table: Any = fields.ForeignKeyField(  # pyright: ignore[reportUnknownVariableType]
        "models.SystemMetaTable",
        related_name="target_columns",
        on_delete=fields.SET_NULL,
        null=True,
        db_column="target_table_id",
    )
    created_at = fields.CharField(max_length=100, null=True, default=utc_iso_now)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        table = "system_meta_columns"


class SystemMetaRelation(models.Model):
    id = fields.IntField(primary_key=True)
    source_table_id: int
    source_table: Any = fields.ForeignKeyField(  # pyright: ignore[reportUnknownVariableType]
        "models.SystemMetaTable",
        related_name="source_relations",
        on_delete=fields.CASCADE,
        db_column="source_table_id",
    )
    source_column_id: int
    source_column: Any = fields.ForeignKeyField(  # pyright: ignore[reportUnknownVariableType]
        "models.SystemMetaColumn",
        related_name="source_relations",
        on_delete=fields.CASCADE,
        db_column="source_column_id",
    )
    target_table_id: int
    target_table: Any = fields.ForeignKeyField(  # pyright: ignore[reportUnknownVariableType]
        "models.SystemMetaTable",
        related_name="target_relations",
        on_delete=fields.CASCADE,
        db_column="target_table_id",
    )
    target_column_id: int | None
    target_column: Any = fields.ForeignKeyField(  # pyright: ignore[reportUnknownVariableType]
        "models.SystemMetaColumn",
        related_name="target_relations",
        on_delete=fields.SET_NULL,
        null=True,
        db_column="target_column_id",
    )

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        table = "system_meta_relations"


class SystemMetaView(models.Model):
    id = fields.IntField(primary_key=True)
    table_id: int
    table: Any = fields.ForeignKeyField(  # pyright: ignore[reportUnknownVariableType]
        "models.SystemMetaTable",
        related_name="views",
        on_delete=fields.CASCADE,
        db_column="table_id",
    )
    name = fields.CharField(max_length=255)
    emoji = fields.CharField(max_length=50, default="📋", null=True)
    type = fields.CharField(max_length=50, default="grid")
    filter_config = fields.TextField(default="[]", null=True)
    sort_config = fields.TextField(default="[]", null=True)
    group_by_column_id: int | None
    group_by_column: Any = fields.ForeignKeyField(  # pyright: ignore[reportUnknownVariableType]
        "models.SystemMetaColumn",
        related_name="views",
        on_delete=fields.SET_NULL,
        null=True,
        db_column="group_by_column_id",
    )
    visible_columns = fields.TextField(default="[]", null=True)
    card_properties = fields.TextField(default="[]", null=True)
    is_default = fields.IntField(default=0, null=True)
    position = fields.IntField(default=0, null=True)
    created_at = fields.CharField(max_length=100, null=True, default=utc_iso_now)
    updated_at = fields.CharField(max_length=100, null=True, default=utc_iso_now)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        table = "system_meta_views"


class SystemMetaRowField(models.Model):
    table_name = fields.CharField(max_length=255)
    row_id = fields.IntField()
    title = fields.TextField(default="", null=True)
    content = fields.TextField(default="", null=True)
    emoji = fields.CharField(max_length=50, default="📄", null=True)
    created_at = fields.CharField(max_length=100, null=True, default=utc_iso_now)
    updated_at = fields.CharField(max_length=100, null=True, default=utc_iso_now)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        table = "system_meta_row_fields"
        unique_together = (("table_name", "row_id"),)
