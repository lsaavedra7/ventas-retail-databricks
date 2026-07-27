# Diccionario de datos

## Origen: clientes (CSV)

| Campo | Tipo Silver | Descripción |
|---|---|---|
| customer_id | BIGINT | Identificador único del cliente (PK). |
| nombre | STRING | Nombre del cliente. |
| apellido | STRING | Apellido del cliente. |
| email | STRING | Correo electrónico normalizado a minúsculas. |
| ciudad | STRING | Ciudad de residencia. |
| pais | STRING | País de residencia. |
| fecha_registro | DATE | Fecha de alta del cliente. |
| segmento | STRING | Segmento `Retail` o `Premium`. |

## Origen: productos (CSV)

| Campo | Tipo Silver | Descripción |
|---|---|---|
| product_id | BIGINT | Identificador único del producto (PK). |
| nombre_producto | STRING | Nombre comercial. |
| categoria | STRING | Categoría del producto. |
| subcategoria | STRING | Subcategoría del producto. |
| precio_unitario | DECIMAL(18,2) | Precio unitario de lista. |
| proveedor | STRING | Proveedor. |
| stock_actual | INT | Inventario actual. |

## Origen: pedidos (JSON)

| Campo | Tipo Silver | Descripción |
|---|---|---|
| order_id | BIGINT | Identificador único del pedido (PK). |
| customer_id | BIGINT | FK hacia clientes. |
| fecha_pedido | DATE | Fecha del pedido. |
| canal_venta | STRING | Canal de venta. |
| estado_pedido | STRING | `completado`, `en_proceso` o `cancelado`. |
| total_pedido | DECIMAL(18,2) | Total declarado en cabecera. |

## Origen: detalle_pedidos (JSON)

| Campo | Tipo Silver | Descripción |
|---|---|---|
| order_item_id | BIGINT | Identificador único de la línea (PK). |
| order_id | BIGINT | FK hacia pedidos. |
| product_id | BIGINT | FK hacia productos. |
| cantidad | INT | Unidades de la línea. |
| precio_unitario | DECIMAL(18,2) | Precio aplicado. |
| descuento | DECIMAL(9,4) | Fracción de descuento entre 0 y 1. |

## Modelo Gold

| Tabla | Tipo | Grano / llave |
|---|---|---|
| dim_cliente | Materialized view | Una fila por `customer_key`. |
| dim_producto | Materialized view | Una fila por `product_key`. |
| dim_fecha | Materialized view | Una fila por `date_key` (`yyyyMMdd`). |
| fact_ventas | Materialized view | Una fila por `sales_key`/`order_item_id`. |

`fact_ventas.monto_total = cantidad × precio_unitario × (1 - descuento)`.
