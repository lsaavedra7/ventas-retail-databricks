import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dashboardDir = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(
  dashboardDir,
  "dashboard_gold.lvdash.json",
);

const palette = [
  "#FF3621",
  "#077A9D",
  "#00A972",
  "#FFAB00",
  "#8B5CF6",
  "#EC4899",
];

const datasetDefinitions = [
  {
    name: "kpis_ejecutivos",
    displayName: "Indicadores ejecutivos",
    query: `
SELECT
  ROUND(SUM(monto_total), 2) AS ventas_totales,
  COUNT(DISTINCT order_id) AS pedidos,
  SUM(cantidad) AS unidades,
  ROUND(SUM(monto_total) / COUNT(DISTINCT order_id), 2) AS ticket_promedio,
  COUNT(DISTINCT customer_key) AS clientes_con_compra,
  COUNT(DISTINCT product_key) AS productos_vendidos
FROM fact_ventas`,
  },
  {
    name: "ventas_fecha",
    displayName: "Evolución diaria de ventas",
    query: `
SELECT
  d.fecha,
  ROUND(SUM(f.monto_total), 2) AS ventas,
  COUNT(DISTINCT f.order_id) AS pedidos,
  SUM(f.cantidad) AS unidades
FROM fact_ventas f
JOIN dim_fecha d ON f.date_key = d.date_key
GROUP BY d.fecha
ORDER BY d.fecha`,
  },
  {
    name: "ventas_categoria",
    displayName: "Ventas por categoría",
    query: `
SELECT
  p.categoria,
  ROUND(SUM(f.monto_total), 2) AS ventas,
  SUM(f.cantidad) AS unidades,
  COUNT(DISTINCT f.order_id) AS pedidos
FROM fact_ventas f
JOIN dim_producto p ON f.product_key = p.product_key
GROUP BY p.categoria
ORDER BY ventas DESC`,
  },
  {
    name: "ventas_canal",
    displayName: "Ventas por canal",
    query: `
SELECT
  INITCAP(canal_venta) AS canal,
  ROUND(SUM(monto_total), 2) AS ventas,
  COUNT(DISTINCT order_id) AS pedidos,
  SUM(cantidad) AS unidades
FROM fact_ventas
GROUP BY canal_venta
ORDER BY ventas DESC`,
  },
  {
    name: "ventas_estado",
    displayName: "Ventas por estado del pedido",
    query: `
SELECT
  INITCAP(REPLACE(estado_pedido, '_', ' ')) AS estado,
  COUNT(DISTINCT order_id) AS pedidos,
  ROUND(SUM(monto_total), 2) AS ventas,
  SUM(cantidad) AS unidades
FROM fact_ventas
GROUP BY estado_pedido
ORDER BY pedidos DESC`,
  },
  {
    name: "ventas_segmento",
    displayName: "Ventas por segmento",
    query: `
SELECT
  c.segmento,
  ROUND(SUM(f.monto_total), 2) AS ventas,
  COUNT(DISTINCT f.order_id) AS pedidos,
  COUNT(DISTINCT f.customer_key) AS clientes,
  ROUND(SUM(f.monto_total) / COUNT(DISTINCT f.order_id), 2) AS ticket_promedio
FROM fact_ventas f
JOIN dim_cliente c ON f.customer_key = c.customer_key
GROUP BY c.segmento
ORDER BY ventas DESC`,
  },
  {
    name: "ventas_pais",
    displayName: "Ventas por país",
    query: `
SELECT
  c.pais,
  ROUND(SUM(f.monto_total), 2) AS ventas,
  COUNT(DISTINCT f.order_id) AS pedidos,
  COUNT(DISTINCT f.customer_key) AS clientes
FROM fact_ventas f
JOIN dim_cliente c ON f.customer_key = c.customer_key
GROUP BY c.pais
ORDER BY ventas DESC`,
  },
  {
    name: "top_clientes",
    displayName: "Top 15 clientes",
    query: `
SELECT
  c.nombre_completo AS cliente,
  c.segmento,
  c.ciudad,
  c.pais,
  COUNT(DISTINCT f.order_id) AS pedidos,
  SUM(f.cantidad) AS unidades,
  ROUND(SUM(f.monto_total), 2) AS ventas,
  ROUND(SUM(f.monto_total) / COUNT(DISTINCT f.order_id), 2) AS ticket_promedio
FROM fact_ventas f
JOIN dim_cliente c ON f.customer_key = c.customer_key
GROUP BY c.nombre_completo, c.segmento, c.ciudad, c.pais
ORDER BY ventas DESC
LIMIT 15`,
  },
  {
    name: "ventas_ciudad",
    displayName: "Rendimiento por ciudad",
    query: `
SELECT
  c.ciudad,
  c.pais,
  COUNT(DISTINCT f.customer_key) AS clientes,
  COUNT(DISTINCT f.order_id) AS pedidos,
  SUM(f.cantidad) AS unidades,
  ROUND(SUM(f.monto_total), 2) AS ventas
FROM fact_ventas f
JOIN dim_cliente c ON f.customer_key = c.customer_key
GROUP BY c.ciudad, c.pais
ORDER BY ventas DESC
LIMIT 20`,
  },
  {
    name: "top_productos",
    displayName: "Top 15 productos",
    query: `
SELECT
  p.nombre_producto AS producto,
  p.categoria,
  p.subcategoria,
  p.proveedor,
  SUM(f.cantidad) AS unidades,
  COUNT(DISTINCT f.order_id) AS pedidos,
  ROUND(SUM(f.monto_total), 2) AS ventas,
  ROUND(SUM(f.monto_total) / SUM(f.cantidad), 2) AS ingreso_por_unidad
FROM fact_ventas f
JOIN dim_producto p ON f.product_key = p.product_key
GROUP BY p.nombre_producto, p.categoria, p.subcategoria, p.proveedor
ORDER BY ventas DESC
LIMIT 15`,
  },
  {
    name: "ventas_subcategoria",
    displayName: "Ventas por subcategoría",
    query: `
SELECT
  p.subcategoria,
  ROUND(SUM(f.monto_total), 2) AS ventas,
  SUM(f.cantidad) AS unidades,
  COUNT(DISTINCT f.order_id) AS pedidos
FROM fact_ventas f
JOIN dim_producto p ON f.product_key = p.product_key
GROUP BY p.subcategoria
ORDER BY ventas DESC
LIMIT 15`,
  },
  {
    name: "inventario",
    displayName: "Inventario y rotación",
    query: `
WITH ventas_producto AS (
  SELECT
    product_key,
    SUM(cantidad) AS unidades_vendidas,
    ROUND(SUM(monto_total), 2) AS ventas
  FROM fact_ventas
  GROUP BY product_key
)
SELECT
  p.nombre_producto AS producto,
  p.categoria,
  p.subcategoria,
  p.proveedor,
  p.stock_actual,
  COALESCE(v.unidades_vendidas, 0) AS unidades_vendidas,
  COALESCE(v.ventas, 0) AS ventas,
  p.stock_actual - COALESCE(v.unidades_vendidas, 0) AS balance_stock,
  CASE
    WHEN COALESCE(v.unidades_vendidas, 0) = 0 THEN 'Sin ventas'
    WHEN p.stock_actual < v.unidades_vendidas THEN 'Stock crítico'
    ELSE 'Cobertura disponible'
  END AS estado_inventario
FROM dim_producto p
LEFT JOIN ventas_producto v ON p.product_key = v.product_key
ORDER BY unidades_vendidas DESC, p.stock_actual ASC`,
  },
  {
    name: "descuentos",
    displayName: "Impacto de descuentos",
    query: `
SELECT
  CASE
    WHEN descuento = 0 THEN 'Sin descuento'
    WHEN descuento <= 0.05 THEN 'Hasta 5%'
    WHEN descuento <= 0.10 THEN '6% a 10%'
    ELSE 'Más de 10%'
  END AS rango_descuento,
  COUNT(*) AS lineas,
  SUM(cantidad) AS unidades,
  ROUND(SUM(cantidad * precio_unitario), 2) AS importe_bruto,
  ROUND(SUM(cantidad * precio_unitario) - SUM(monto_total), 2) AS descuento_otorgado,
  ROUND(SUM(monto_total), 2) AS ventas_netas
FROM fact_ventas
GROUP BY
  CASE
    WHEN descuento = 0 THEN 'Sin descuento'
    WHEN descuento <= 0.05 THEN 'Hasta 5%'
    WHEN descuento <= 0.10 THEN '6% a 10%'
    ELSE 'Más de 10%'
  END
ORDER BY ventas_netas DESC`,
  },
  {
    name: "reconciliacion",
    displayName: "Reconciliación de pedidos",
    query: `
WITH totales AS (
  SELECT
    order_id,
    MAX(total_pedido) AS total_cabecera,
    ROUND(SUM(monto_total), 2) AS total_detalle
  FROM fact_ventas
  GROUP BY order_id
)
SELECT
  order_id,
  total_cabecera,
  total_detalle,
  ROUND(total_detalle - total_cabecera, 2) AS diferencia,
  CASE
    WHEN ABS(total_detalle - total_cabecera) <= 0.01 THEN 'Conciliado'
    ELSE 'Con diferencia'
  END AS resultado
FROM totales
ORDER BY ABS(total_detalle - total_cabecera) DESC, order_id`,
  },
  {
    name: "calidad_modelo",
    displayName: "Cobertura y calidad del modelo Gold",
    query: `
SELECT
  (SELECT COUNT(*) FROM fact_ventas) AS filas_fact,
  (
    SELECT COUNT(*)
    FROM fact_ventas
    WHERE customer_key IS NOT NULL
      AND product_key IS NOT NULL
      AND date_key IS NOT NULL
  ) AS filas_con_llaves_validas,
  (SELECT COUNT(*) FROM dim_cliente) AS clientes_dimension,
  (SELECT COUNT(*) FROM dim_producto) AS productos_dimension,
  (SELECT COUNT(*) FROM dim_fecha) AS fechas_dimension,
  (
    SELECT COUNT(*)
    FROM dim_producto p
    LEFT ANTI JOIN fact_ventas f ON p.product_key = f.product_key
  ) AS productos_sin_ventas`,
  },
];

function queryLines(query) {
  const normalized = query.trim();
  return normalized.split("\n").map((line, index, lines) =>
    index < lines.length - 1 ? `${line}\n` : line,
  );
}

function titleWidget(name, text, position) {
  return {
    widget: {
      name,
      multilineTextboxSpec: { lines: [`# ${text}`] },
    },
    position,
  };
}

function queryFields(fields) {
  return fields.map((field) => ({
    name: field,
    expression: `\`${field}\``,
  }));
}

function counterWidget({
  name,
  dataset,
  field,
  title,
  position,
}) {
  return {
    widget: {
      name,
      queries: [
        {
          name: "main_query",
          query: {
            datasetName: dataset,
            fields: queryFields([field]),
            disaggregated: true,
          },
        },
      ],
      spec: {
        encodings: {
          value: {
            displayName: title,
            fieldName: field,
          },
        },
        frame: { showTitle: true, title },
        version: 2,
        widgetType: "counter",
      },
    },
    position,
  };
}

function chartWidget({
  name,
  widgetType,
  dataset,
  category,
  value,
  title,
  categoryTitle,
  valueTitle,
  position,
  temporal = false,
}) {
  return {
    widget: {
      name,
      queries: [
        {
          name: "main_query",
          query: {
            datasetName: dataset,
            fields: queryFields([category, value]),
            disaggregated: true,
          },
        },
      ],
      spec: {
        encodings: {
          x: {
            axis: { title: categoryTitle },
            displayName: categoryTitle,
            fieldName: category,
            scale: { type: temporal ? "temporal" : "categorical" },
          },
          y: {
            axis: { title: valueTitle },
            displayName: valueTitle,
            fieldName: value,
            scale: { type: "quantitative" },
          },
        },
        frame: { showTitle: true, title },
        mark: { colors: palette },
        version: 3,
        widgetType,
      },
    },
    position,
  };
}

function tableWidget({
  name,
  dataset,
  title,
  columns,
  position,
  itemsPerPage = 15,
}) {
  return {
    widget: {
      name,
      queries: [
        {
          name: "main_query",
          query: {
            datasetName: dataset,
            fields: queryFields(columns.map((column) => column.field)),
            disaggregated: true,
          },
        },
      ],
      spec: {
        allowHTMLByDefault: false,
        condensed: true,
        encodings: {
          columns: columns.map((column, index) => ({
            displayAs: column.displayAs ?? "string",
            displayName: column.title,
            fieldName: column.field,
            ...(column.numberFormat
              ? { numberFormat: column.numberFormat }
              : {}),
            order: 100000 + index,
            title: column.title,
            type: column.type ?? "string",
            visible: true,
          })),
        },
        frame: { showTitle: true, title },
        itemsPerPage,
        paginationSize: "default",
        version: 1,
        widgetType: "table",
        withRowNumber: true,
      },
    },
    position,
  };
}

const pages = [
  {
    name: "resumen_ejecutivo",
    displayName: "Resumen ejecutivo",
    pageType: "PAGE_TYPE_CANVAS",
    layout: [
      titleWidget(
        "titulo_resumen",
        "Ventas Retail · Resumen ejecutivo",
        { x: 0, y: 0, width: 6, height: 1 },
      ),
      counterWidget({
        name: "kpi_ventas",
        dataset: "kpis_ejecutivos",
        field: "ventas_totales",
        title: "Ventas totales",
        position: { x: 0, y: 1, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_pedidos",
        dataset: "kpis_ejecutivos",
        field: "pedidos",
        title: "Pedidos con detalle",
        position: { x: 2, y: 1, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_unidades",
        dataset: "kpis_ejecutivos",
        field: "unidades",
        title: "Unidades vendidas",
        position: { x: 4, y: 1, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_ticket",
        dataset: "kpis_ejecutivos",
        field: "ticket_promedio",
        title: "Ticket promedio",
        position: { x: 0, y: 3, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_clientes",
        dataset: "kpis_ejecutivos",
        field: "clientes_con_compra",
        title: "Clientes compradores",
        position: { x: 2, y: 3, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_productos",
        dataset: "kpis_ejecutivos",
        field: "productos_vendidos",
        title: "Productos vendidos",
        position: { x: 4, y: 3, width: 2, height: 2 },
      }),
      chartWidget({
        name: "linea_ventas_fecha",
        widgetType: "line",
        dataset: "ventas_fecha",
        category: "fecha",
        value: "ventas",
        title: "Evolución diaria de ventas",
        categoryTitle: "Fecha",
        valueTitle: "Ventas",
        temporal: true,
        position: { x: 0, y: 5, width: 6, height: 5 },
      }),
      chartWidget({
        name: "barras_categoria",
        widgetType: "bar",
        dataset: "ventas_categoria",
        category: "categoria",
        value: "ventas",
        title: "Ventas por categoría",
        categoryTitle: "Categoría",
        valueTitle: "Ventas",
        position: { x: 0, y: 10, width: 3, height: 5 },
      }),
      chartWidget({
        name: "barras_canal",
        widgetType: "bar",
        dataset: "ventas_canal",
        category: "canal",
        value: "ventas",
        title: "Ventas por canal",
        categoryTitle: "Canal",
        valueTitle: "Ventas",
        position: { x: 3, y: 10, width: 3, height: 5 },
      }),
    ],
  },
  {
    name: "clientes_geografia",
    displayName: "Clientes y geografía",
    pageType: "PAGE_TYPE_CANVAS",
    layout: [
      titleWidget(
        "titulo_clientes",
        "Clientes y geografía",
        { x: 0, y: 0, width: 6, height: 1 },
      ),
      chartWidget({
        name: "barras_segmento",
        widgetType: "bar",
        dataset: "ventas_segmento",
        category: "segmento",
        value: "ventas",
        title: "Ventas por segmento",
        categoryTitle: "Segmento",
        valueTitle: "Ventas",
        position: { x: 0, y: 1, width: 3, height: 5 },
      }),
      chartWidget({
        name: "barras_pais",
        widgetType: "bar",
        dataset: "ventas_pais",
        category: "pais",
        value: "ventas",
        title: "Ventas por país",
        categoryTitle: "País",
        valueTitle: "Ventas",
        position: { x: 3, y: 1, width: 3, height: 5 },
      }),
      tableWidget({
        name: "tabla_top_clientes",
        dataset: "top_clientes",
        title: "Top 15 clientes por ventas",
        position: { x: 0, y: 6, width: 6, height: 7 },
        columns: [
          { field: "cliente", title: "Cliente" },
          { field: "segmento", title: "Segmento" },
          { field: "ciudad", title: "Ciudad" },
          { field: "pais", title: "País" },
          {
            field: "pedidos",
            title: "Pedidos",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "unidades",
            title: "Unidades",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "ventas",
            title: "Ventas",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
          {
            field: "ticket_promedio",
            title: "Ticket promedio",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
        ],
      }),
      tableWidget({
        name: "tabla_ciudades",
        dataset: "ventas_ciudad",
        title: "Rendimiento por ciudad",
        position: { x: 0, y: 13, width: 6, height: 7 },
        columns: [
          { field: "ciudad", title: "Ciudad" },
          { field: "pais", title: "País" },
          {
            field: "clientes",
            title: "Clientes",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "pedidos",
            title: "Pedidos",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "unidades",
            title: "Unidades",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "ventas",
            title: "Ventas",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
        ],
      }),
    ],
  },
  {
    name: "productos_inventario",
    displayName: "Productos e inventario",
    pageType: "PAGE_TYPE_CANVAS",
    layout: [
      titleWidget(
        "titulo_productos",
        "Productos e inventario",
        { x: 0, y: 0, width: 6, height: 1 },
      ),
      chartWidget({
        name: "barras_top_productos",
        widgetType: "bar",
        dataset: "top_productos",
        category: "producto",
        value: "ventas",
        title: "Top 15 productos por ventas",
        categoryTitle: "Producto",
        valueTitle: "Ventas",
        position: { x: 0, y: 1, width: 3, height: 6 },
      }),
      chartWidget({
        name: "barras_subcategoria",
        widgetType: "bar",
        dataset: "ventas_subcategoria",
        category: "subcategoria",
        value: "ventas",
        title: "Ventas por subcategoría",
        categoryTitle: "Subcategoría",
        valueTitle: "Ventas",
        position: { x: 3, y: 1, width: 3, height: 6 },
      }),
      tableWidget({
        name: "tabla_top_productos",
        dataset: "top_productos",
        title: "Detalle de productos líderes",
        position: { x: 0, y: 7, width: 6, height: 7 },
        columns: [
          { field: "producto", title: "Producto" },
          { field: "categoria", title: "Categoría" },
          { field: "subcategoria", title: "Subcategoría" },
          { field: "proveedor", title: "Proveedor" },
          {
            field: "unidades",
            title: "Unidades",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "pedidos",
            title: "Pedidos",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "ventas",
            title: "Ventas",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
          {
            field: "ingreso_por_unidad",
            title: "Ingreso/unidad",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
        ],
      }),
      tableWidget({
        name: "tabla_inventario",
        dataset: "inventario",
        title: "Inventario, ventas y cobertura",
        position: { x: 0, y: 14, width: 6, height: 8 },
        itemsPerPage: 20,
        columns: [
          { field: "producto", title: "Producto" },
          { field: "categoria", title: "Categoría" },
          { field: "subcategoria", title: "Subcategoría" },
          { field: "proveedor", title: "Proveedor" },
          {
            field: "stock_actual",
            title: "Stock",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "unidades_vendidas",
            title: "Unidades vendidas",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "ventas",
            title: "Ventas",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
          {
            field: "balance_stock",
            title: "Balance stock",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          { field: "estado_inventario", title: "Estado" },
        ],
      }),
    ],
  },
  {
    name: "operacion_calidad",
    displayName: "Operación y calidad",
    pageType: "PAGE_TYPE_CANVAS",
    layout: [
      titleWidget(
        "titulo_calidad",
        "Operación, descuentos y calidad Gold",
        { x: 0, y: 0, width: 6, height: 1 },
      ),
      counterWidget({
        name: "kpi_filas_fact",
        dataset: "calidad_modelo",
        field: "filas_fact",
        title: "Filas de hechos",
        position: { x: 0, y: 1, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_llaves_validas",
        dataset: "calidad_modelo",
        field: "filas_con_llaves_validas",
        title: "Filas con llaves válidas",
        position: { x: 2, y: 1, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_clientes_dim",
        dataset: "calidad_modelo",
        field: "clientes_dimension",
        title: "Clientes en dimensión",
        position: { x: 4, y: 1, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_productos_dim",
        dataset: "calidad_modelo",
        field: "productos_dimension",
        title: "Productos en dimensión",
        position: { x: 0, y: 3, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_fechas_dim",
        dataset: "calidad_modelo",
        field: "fechas_dimension",
        title: "Fechas en dimensión",
        position: { x: 2, y: 3, width: 2, height: 2 },
      }),
      counterWidget({
        name: "kpi_productos_sin_venta",
        dataset: "calidad_modelo",
        field: "productos_sin_ventas",
        title: "Productos sin ventas",
        position: { x: 4, y: 3, width: 2, height: 2 },
      }),
      chartWidget({
        name: "barras_estado",
        widgetType: "bar",
        dataset: "ventas_estado",
        category: "estado",
        value: "pedidos",
        title: "Pedidos por estado",
        categoryTitle: "Estado",
        valueTitle: "Pedidos",
        position: { x: 0, y: 5, width: 3, height: 5 },
      }),
      chartWidget({
        name: "barras_descuento",
        widgetType: "bar",
        dataset: "descuentos",
        category: "rango_descuento",
        value: "ventas_netas",
        title: "Ventas netas por rango de descuento",
        categoryTitle: "Rango de descuento",
        valueTitle: "Ventas netas",
        position: { x: 3, y: 5, width: 3, height: 5 },
      }),
      tableWidget({
        name: "tabla_descuentos",
        dataset: "descuentos",
        title: "Impacto económico de descuentos",
        position: { x: 0, y: 10, width: 6, height: 6 },
        columns: [
          { field: "rango_descuento", title: "Rango" },
          {
            field: "lineas",
            title: "Líneas",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "unidades",
            title: "Unidades",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "importe_bruto",
            title: "Importe bruto",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
          {
            field: "descuento_otorgado",
            title: "Descuento",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
          {
            field: "ventas_netas",
            title: "Ventas netas",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
        ],
      }),
      tableWidget({
        name: "tabla_reconciliacion",
        dataset: "reconciliacion",
        title: "Reconciliación cabecera vs. detalle",
        position: { x: 0, y: 16, width: 6, height: 8 },
        itemsPerPage: 20,
        columns: [
          {
            field: "order_id",
            title: "Pedido",
            displayAs: "number",
            type: "integer",
            numberFormat: "0",
          },
          {
            field: "total_cabecera",
            title: "Total cabecera",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
          {
            field: "total_detalle",
            title: "Total detalle",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
          {
            field: "diferencia",
            title: "Diferencia",
            displayAs: "number",
            type: "float",
            numberFormat: "$0.00",
          },
          { field: "resultado", title: "Resultado" },
        ],
      }),
    ],
  },
];

const dashboard = {
  datasets: datasetDefinitions.map(({ name, displayName, query }) => ({
    name,
    displayName,
    queryLines: queryLines(query),
  })),
  pages,
};

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(dashboard, null, 2)}\n`,
  "utf8",
);

console.log(
  `Dashboard generado: ${dashboard.datasets.length} datasets, ` +
    `${dashboard.pages.length} páginas y ` +
    `${dashboard.pages.reduce(
      (total, page) => total + page.layout.length,
      0,
    )} widgets.`,
);
