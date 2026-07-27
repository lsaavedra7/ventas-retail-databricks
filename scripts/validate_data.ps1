$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $projectRoot "data"

$clientes = @(
    Get-ChildItem (Join-Path $dataRoot "clientes") -Filter "*.csv" |
        Sort-Object Name |
        ForEach-Object { Import-Csv $_.FullName }
)
$productos = @(
    Get-ChildItem (Join-Path $dataRoot "productos") -Filter "*.csv" |
        Sort-Object Name |
        ForEach-Object { Import-Csv $_.FullName }
)
$pedidos = @(
    foreach ($file in (Get-ChildItem (Join-Path $dataRoot "pedidos") -Filter "*.json" | Sort-Object Name)) {
        foreach ($row in (Get-Content $file.FullName -Raw | ConvertFrom-Json)) {
            $row
        }
    }
)
$detalles = @(
    foreach ($file in (Get-ChildItem (Join-Path $dataRoot "detalle_pedidos") -Filter "*.json" | Sort-Object Name)) {
        foreach ($row in (Get-Content $file.FullName -Raw | ConvertFrom-Json)) {
            $row
        }
    }
)

$customerIds = @($clientes.customer_id | ForEach-Object { [int]$_ })
$productIds = @($productos.product_id | ForEach-Object { [int]$_ })
$orderIds = @($pedidos.order_id | ForEach-Object { [int]$_ })

$checks = [ordered]@{
    clientes_filas = $clientes.Count
    clientes_ids_unicos = ($customerIds | Sort-Object -Unique).Count
    productos_filas = $productos.Count
    productos_ids_unicos = ($productIds | Sort-Object -Unique).Count
    pedidos_filas = $pedidos.Count
    pedidos_ids_unicos = ($orderIds | Sort-Object -Unique).Count
    detalle_filas = $detalles.Count
    detalle_ids_unicos = ($detalles.order_item_id | Sort-Object -Unique).Count
    pedidos_sin_cliente = @($pedidos | Where-Object { [int]$_.customer_id -notin $customerIds }).Count
    detalles_sin_pedido = @($detalles | Where-Object { [int]$_.order_id -notin $orderIds }).Count
    detalles_sin_producto = @($detalles | Where-Object { [int]$_.product_id -notin $productIds }).Count
}

$checks | Format-Table -AutoSize

if (
    $checks.clientes_filas -ne 66 -or
    $checks.productos_filas -ne 60 -or
    $checks.pedidos_filas -ne 66 -or
    $checks.detalle_filas -ne 72 -or
    $checks.clientes_filas -ne $checks.clientes_ids_unicos -or
    $checks.productos_filas -ne $checks.productos_ids_unicos -or
    $checks.pedidos_filas -ne $checks.pedidos_ids_unicos -or
    $checks.detalle_filas -ne $checks.detalle_ids_unicos -or
    $checks.pedidos_sin_cliente -ne 0 -or
    $checks.detalles_sin_pedido -ne 0 -or
    $checks.detalles_sin_producto -ne 0
) {
    throw "La validación de datos no pasó."
}

Write-Host "Validación de datos exitosa."
