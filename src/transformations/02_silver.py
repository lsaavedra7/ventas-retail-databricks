"""Capa Silver: tipado, limpieza, deduplicación y expectativas."""

from pyspark import pipelines as dp
from pyspark.sql import functions as F


CATALOG = spark.conf.get("project.catalog")
BRONZE_SCHEMA = spark.conf.get("project.bronze_schema")
SILVER_SCHEMA = spark.conf.get("project.silver_schema")


@dp.table(
    name=f"{CATALOG}.{SILVER_SCHEMA}.clientes",
    comment="Clientes tipados y deduplicados por customer_id.",
    table_properties={"quality": "silver"},
)
@dp.expect_or_fail("customer_id_no_nulo", "customer_id IS NOT NULL")
@dp.expect(
    "email_formato_valido",
    "email RLIKE '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
)
@dp.expect_or_drop("segmento_permitido", "segmento IN ('Retail', 'Premium')")
def clientes():
    return (
        spark.readStream.table(
            f"{CATALOG}.{BRONZE_SCHEMA}.clientes_raw"
        )
        .select(
            F.col("customer_id").cast("long").alias("customer_id"),
            F.initcap(F.trim("nombre")).alias("nombre"),
            F.initcap(F.trim("apellido")).alias("apellido"),
            F.lower(F.trim("email")).alias("email"),
            F.initcap(F.trim("ciudad")).alias("ciudad"),
            F.initcap(F.trim("pais")).alias("pais"),
            F.to_date("fecha_registro", "yyyy-MM-dd").alias(
                "fecha_registro"
            ),
            F.trim("segmento").alias("segmento"),
            "_ingested_at",
            "_source_file",
            "_source_modification_time",
        )
        .dropDuplicates(["customer_id"])
    )


@dp.table(
    name=f"{CATALOG}.{SILVER_SCHEMA}.productos",
    comment="Productos tipados y deduplicados por product_id.",
    table_properties={"quality": "silver"},
)
@dp.expect_or_fail("product_id_no_nulo", "product_id IS NOT NULL")
@dp.expect_or_drop("precio_unitario_positivo", "precio_unitario > 0")
@dp.expect("stock_no_negativo", "stock_actual >= 0")
def productos():
    return (
        spark.readStream.table(
            f"{CATALOG}.{BRONZE_SCHEMA}.productos_raw"
        )
        .select(
            F.col("product_id").cast("long").alias("product_id"),
            F.trim("nombre_producto").alias("nombre_producto"),
            F.initcap(F.trim("categoria")).alias("categoria"),
            F.initcap(F.trim("subcategoria")).alias("subcategoria"),
            F.col("precio_unitario")
            .cast("decimal(18,2)")
            .alias("precio_unitario"),
            F.trim("proveedor").alias("proveedor"),
            F.col("stock_actual").cast("int").alias("stock_actual"),
            "_ingested_at",
            "_source_file",
            "_source_modification_time",
        )
        .dropDuplicates(["product_id"])
    )


@dp.table(
    name=f"{CATALOG}.{SILVER_SCHEMA}.pedidos",
    comment="Cabeceras de pedido tipadas y deduplicadas por order_id.",
    table_properties={"quality": "silver"},
)
@dp.expect_or_fail("order_id_no_nulo", "order_id IS NOT NULL")
@dp.expect_or_drop(
    "estado_pedido_permitido",
    "estado_pedido IN ('completado', 'en_proceso', 'cancelado')",
)
@dp.expect("total_pedido_no_negativo", "total_pedido >= 0")
def pedidos():
    return (
        spark.readStream.table(f"{CATALOG}.{BRONZE_SCHEMA}.pedidos_raw")
        .select(
            F.col("order_id").cast("long").alias("order_id"),
            F.col("customer_id").cast("long").alias("customer_id"),
            F.to_date("fecha_pedido", "yyyy-MM-dd").alias("fecha_pedido"),
            F.lower(F.trim("canal_venta")).alias("canal_venta"),
            F.lower(F.trim("estado_pedido")).alias("estado_pedido"),
            F.col("total_pedido")
            .cast("decimal(18,2)")
            .alias("total_pedido"),
            "_ingested_at",
            "_source_file",
            "_source_modification_time",
        )
        .dropDuplicates(["order_id"])
    )


@dp.table(
    name=f"{CATALOG}.{SILVER_SCHEMA}.detalle_pedidos",
    comment="Líneas de pedido tipadas y deduplicadas por order_item_id.",
    table_properties={"quality": "silver"},
)
@dp.expect_or_fail("order_item_id_no_nulo", "order_item_id IS NOT NULL")
@dp.expect_all_or_drop(
    {
        "cantidad_positiva": "cantidad > 0",
        "order_id_no_nulo": "order_id IS NOT NULL",
        "product_id_no_nulo": "product_id IS NOT NULL",
    }
)
@dp.expect(
    "descuento_en_rango", "descuento >= 0 AND descuento <= 1"
)
def detalle_pedidos():
    return (
        spark.readStream.table(
            f"{CATALOG}.{BRONZE_SCHEMA}.detalle_pedidos_raw"
        )
        .select(
            F.col("order_item_id").cast("long").alias("order_item_id"),
            F.col("order_id").cast("long").alias("order_id"),
            F.col("product_id").cast("long").alias("product_id"),
            F.col("cantidad").cast("int").alias("cantidad"),
            F.col("precio_unitario")
            .cast("decimal(18,2)")
            .alias("precio_unitario"),
            F.col("descuento")
            .cast("decimal(9,4)")
            .alias("descuento"),
            "_ingested_at",
            "_source_file",
            "_source_modification_time",
        )
        .dropDuplicates(["order_item_id"])
    )
