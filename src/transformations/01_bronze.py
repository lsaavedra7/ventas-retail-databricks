"""Capa Bronze: ingesta incremental desde un Unity Catalog Volume."""

from pyspark import pipelines as dp
from pyspark.sql import functions as F


CATALOG = spark.conf.get("project.catalog")
LANDING_SCHEMA = spark.conf.get("project.landing_schema")
BRONZE_SCHEMA = spark.conf.get("project.bronze_schema")
VOLUME_NAME = spark.conf.get("project.volume_name")
PROJECT_NAME = spark.conf.get("project.name")

VOLUME_ROOT = (
    f"/Volumes/{CATALOG}/{LANDING_SCHEMA}/{VOLUME_NAME}/{PROJECT_NAME}"
)


def _read_csv_stream(entity: str):
    return (
        spark.readStream.format("cloudFiles")
        .option("cloudFiles.format", "csv")
        .option("cloudFiles.inferColumnTypes", "true")
        .option("header", "true")
        .load(f"{VOLUME_ROOT}/{entity}/")
        .select(
            "*",
            F.current_timestamp().alias("_ingested_at"),
            F.col("_metadata.file_path").alias("_source_file"),
            F.col("_metadata.file_modification_time").alias(
                "_source_modification_time"
            ),
        )
    )


def _read_json_stream(entity: str):
    return (
        spark.readStream.format("cloudFiles")
        .option("cloudFiles.format", "json")
        .option("cloudFiles.inferColumnTypes", "true")
        .option("multiLine", "true")
        .load(f"{VOLUME_ROOT}/{entity}/")
        .select(
            "*",
            F.current_timestamp().alias("_ingested_at"),
            F.col("_metadata.file_path").alias("_source_file"),
            F.col("_metadata.file_modification_time").alias(
                "_source_modification_time"
            ),
        )
    )


@dp.table(
    name=f"{CATALOG}.{BRONZE_SCHEMA}.clientes_raw",
    comment="Clientes CSV sin transformar, ingeridos incrementalmente con Auto Loader.",
    table_properties={"quality": "bronze", "source_format": "csv"},
)
def clientes_raw():
    return _read_csv_stream("clientes")


@dp.table(
    name=f"{CATALOG}.{BRONZE_SCHEMA}.productos_raw",
    comment="Productos CSV sin transformar, ingeridos incrementalmente con Auto Loader.",
    table_properties={"quality": "bronze", "source_format": "csv"},
)
def productos_raw():
    return _read_csv_stream("productos")


@dp.table(
    name=f"{CATALOG}.{BRONZE_SCHEMA}.pedidos_raw",
    comment="Pedidos JSON sin transformar, ingeridos incrementalmente con Auto Loader.",
    table_properties={"quality": "bronze", "source_format": "json"},
)
def pedidos_raw():
    return _read_json_stream("pedidos")


@dp.table(
    name=f"{CATALOG}.{BRONZE_SCHEMA}.detalle_pedidos_raw",
    comment="Detalle de pedidos JSON sin transformar, ingerido con Auto Loader.",
    table_properties={"quality": "bronze", "source_format": "json"},
)
def detalle_pedidos_raw():
    return _read_json_stream("detalle_pedidos")
