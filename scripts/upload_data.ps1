param(
    [string]$DatabricksExecutable = "databricks",
    [string]$Profile = "",
    [string]$Catalog = "dbassociate",
    [string]$LandingSchema = "landing",
    [string]$VolumeName = "raw_data",
    [string]$ProjectName = "ventas_retail_luissaavedra"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = "dbfs:/Volumes/$Catalog/$LandingSchema/$VolumeName/$ProjectName"
$profileArgs = @()
if ($Profile) {
    $profileArgs = @("--profile", $Profile)
}

foreach ($entity in @("clientes", "productos", "pedidos", "detalle_pedidos")) {
    $source = Join-Path $projectRoot "data\$entity"
    $target = "$destination/$entity"
    & $DatabricksExecutable fs cp -r $source $target --overwrite @profileArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Falló la carga de $entity a $target"
    }
}

Write-Host "Carga terminada en $destination"
