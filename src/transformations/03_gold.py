"""Capa Gold: esquema estrella en materialized views."""

from pyspark import pipelines as dp
from pyspark.sql import functions as F


CATALOG = spark.conf.get("project.catalog")
SILVER_SCHEMA = spark.conf.get("project.silver_schema")
GOLD_SCHEMA = spark.conf.get("project.gold_schema")


@dp.materialized_view(
    name=f"{CATALOG}.{GOLD_SCHEMA}.dim_cliente",
    comment="Dimensión cliente; una fila por customer_key.",
    table_properties={"quality": "gold", "model_role": "dimension"},
)
@dp.expect_or_fail("customer_key_no_nulo", "customer_key IS NOT NULL")
@dp.expect(
    "segmento_dimension_valido",
    "segmento IN ('Retail', 'Premium')",
)
def dim_cliente():
    return (
        spark.read.table(f"{CATALOG}.{SILVER_SCHEMA}.clientes")
        .select(
            F.col("customer_id").alias("customer_key"),
            "customer_id",
            "nombre",
            "apellido",
            F.concat_ws(" ", "nombre", "apellido").alias("nombre_completo"),
            "email",
            "ciudad",
            "pais",
            "fecha_registro",
            "segmento",
        )
        .dropDuplicates(["customer_key"])
    )


@dp.materialized_view(
    name=f"{CATALOG}.{GOLD_SCHEMA}.dim_producto",
    comment="Dimensión producto; una fila por product_key.",
    table_properties={"quality": "gold", "model_role": "dimension"},
)
@dp.expect_or_fail("product_key_no_nulo", "product_key IS NOT NULL")
@dp.expect("precio_lista_positivo", "precio_lista > 0")
def dim_producto():
    return (
        spark.read.table(f"{CATALOG}.{SILVER_SCHEMA}.productos")
        .select(
            F.col("product_id").alias("product_key"),
            "product_id",
            "nombre_producto",
            "categoria",
            "subcategoria",
            F.col("precio_unitario").alias("precio_lista"),
            "proveedor",
            "stock_actual",
        )
        .dropDuplicates(["product_key"])
    )


@dp.materialized_view(
    name=f"{CATALOG}.{GOLD_SCHEMA}.dim_fecha",
    comment="Dimensión fecha; una fila por fecha de pedido.",
    table_properties={"quality": "gold", "model_role": "dimension"},
)
@dp.expect_or_fail("date_key_no_nulo", "date_key IS NOT NULL")
@dp.expect("anio_valido", "anio >= 2020")
def dim_fecha():
    return (
        spark.read.table(f"{CATALOG}.{SILVER_SCHEMA}.pedidos")
        .select(F.col("fecha_pedido").alias("fecha"))
        .where(F.col("fecha").isNotNull())
        .distinct()
        .select(
            F.date_format("fecha", "yyyyMMdd").cast("int").alias("date_key"),
            "fecha",
            F.year("fecha").alias("anio"),
            F.quarter("fecha").alias("trimestre"),
            F.month("fecha").alias("mes_numero"),
            F.date_format("fecha", "MMMM").alias("mes_nombre"),
            F.dayofmonth("fecha").alias("dia_mes"),
            F.dayofweek("fecha").alias("dia_semana_numero"),
            F.date_format("fecha", "EEEE").alias("dia_semana_nombre"),
            F.weekofyear("fecha").alias("semana_anio"),
        )
    )


@dp.materialized_view(
    name=f"{CATALOG}.{GOLD_SCHEMA}.fact_ventas",
    comment="Hechos de ventas; una fila por línea de pedido.",
    table_properties={
        "quality": "gold",
        "model_role": "fact",
        "grain": "order_item_id",
    },
)
@dp.expect_or_fail(
    "llaves_dimensionales_presentes",
    "customer_key IS NOT NULL AND product_key IS NOT NULL AND date_key IS NOT NULL",
)
@dp.expect_all_or_drop(
    {
        "cantidad_fact_positiva": "cantidad > 0",
        "precio_fact_positivo": "precio_unitario > 0",
        "descuento_fact_en_rango": "descuento >= 0 AND descuento <= 1",
        "monto_total_no_negativo": "monto_total >= 0",
    }
)
@dp.expect("total_cabecera_no_negativo", "total_pedido >= 0")
def fact_ventas():
    detalle = spark.read.table(
        f"{CATALOG}.{SILVER_SCHEMA}.detalle_pedidos"
    ).alias("d")
    pedidos = spark.read.table(
        f"{CATALOG}.{SILVER_SCHEMA}.pedidos"
    ).alias("o")
    clientes = spark.read.table(
        f"{CATALOG}.{GOLD_SCHEMA}.dim_cliente"
    ).alias("c")
    productos = spark.read.table(
        f"{CATALOG}.{GOLD_SCHEMA}.dim_producto"
    ).alias("p")
    fechas = spark.read.table(f"{CATALOG}.{GOLD_SCHEMA}.dim_fecha").alias(
        "f"
    )

    return (
        detalle.join(pedidos, F.col("d.order_id") == F.col("o.order_id"))
        .join(
            clientes,
            F.col("o.customer_id") == F.col("c.customer_key"),
        )
        .join(
            productos,
            F.col("d.product_id") == F.col("p.product_key"),
        )
        .join(fechas, F.col("o.fecha_pedido") == F.col("f.fecha"))
        .select(
            F.col("d.order_item_id").alias("sales_key"),
            F.col("d.order_item_id"),
            F.col("d.order_id"),
            F.col("c.customer_key"),
            F.col("p.product_key"),
            F.col("f.date_key"),
            F.col("o.fecha_pedido"),
            F.col("o.canal_venta"),
            F.col("o.estado_pedido"),
            F.col("d.cantidad"),
            F.col("d.precio_unitario"),
            F.col("d.descuento"),
            (
                F.col("d.cantidad")
                * F.col("d.precio_unitario")
                * (F.lit(1) - F.col("d.descuento"))
            )
            .cast("decimal(18,2)")
            .alias("monto_total"),
            F.col("o.total_pedido"),
        )
        .dropDuplicates(["sales_key"])
    )
