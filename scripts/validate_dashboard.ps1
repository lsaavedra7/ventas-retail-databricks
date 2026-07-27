param(
    [string]$Profile = "",
    [Parameter(Mandatory = $true)]
    [string]$WarehouseId,
    [string]$Catalog = "dbassociate",
    [string]$Schema = "gold",
    [string]$DatabricksExecutable = "databricks"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$dashboardPath = Join-Path $projectRoot "dashboard\dashboard_gold.lvdash.json"
$requestDirectory = Join-Path $projectRoot ".tmp\dashboard-validation"

New-Item -ItemType Directory -Force -Path $requestDirectory | Out-Null
$dashboard = Get-Content -Raw -Encoding UTF8 $dashboardPath | ConvertFrom-Json
$results = @()
$profileArgs = @()
if ($Profile) {
    $profileArgs = @("--profile", $Profile)
}

foreach ($dataset in $dashboard.datasets) {
    $requestPath = Join-Path $requestDirectory "$($dataset.name).json"
    $payload = @{
        warehouse_id = $WarehouseId
        catalog = $Catalog
        schema = $Schema
        statement = ($dataset.queryLines -join "")
        wait_timeout = "50s"
        disposition = "INLINE"
    }

    $payloadJson = $payload | ConvertTo-Json -Depth 10
    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText(
        $requestPath,
        $payloadJson,
        $utf8WithoutBom
    )

    $response = & $DatabricksExecutable api post /api/2.0/sql/statements `
        --json "@$requestPath" `
        @profileArgs |
        ConvertFrom-Json

    $attempt = 0
    while (
        $response.status.state -in @("PENDING", "RUNNING") -and
        $attempt -lt 30
    ) {
        Start-Sleep -Seconds 2
        $response = & $DatabricksExecutable api get `
            "/api/2.0/sql/statements/$($response.statement_id)" `
            @profileArgs |
            ConvertFrom-Json
        $attempt++
    }

    $result = [PSCustomObject]@{
        dataset = $dataset.name
        status = $response.status.state
        rows = $response.result.row_count
        error = $response.status.error.message
    }
    $results += $result

    if ($response.status.state -ne "SUCCEEDED") {
        $results | Format-Table -AutoSize
        throw "Falló la consulta del dataset '$($dataset.name)'."
    }
}

$results | Format-Table -AutoSize
Write-Host ""
Write-Host "Consultas validadas: $($results.Count)/$($dashboard.datasets.Count)"
