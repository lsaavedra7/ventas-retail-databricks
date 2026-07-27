"""Pruebas estáticas que no requieren un runtime de Databricks."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_required_source_files_exist():
    required = {
        "databricks.yml",
        "resources/pipeline.yml",
        "resources/job.yml",
        "resources/dashboard.yml",
        "setup/00_setup.sql",
        "src/transformations/01_bronze.py",
        "src/transformations/02_silver.py",
        "src/transformations/03_gold.py",
        "dashboard/dashboard_gold.lvdash.json",
    }
    missing = sorted(path for path in required if not (ROOT / path).exists())
    assert not missing, f"Faltan archivos: {missing}"


def test_all_twelve_batches_are_versioned():
    files = list((ROOT / "data").glob("*/*"))
    batches = [path for path in files if path.suffix in {".csv", ".json"}]
    assert len(batches) == 12


def test_streaming_and_expectations_are_explicit():
    bronze = (ROOT / "src/transformations/01_bronze.py").read_text(
        encoding="utf-8"
    )
    silver = (ROOT / "src/transformations/02_silver.py").read_text(
        encoding="utf-8"
    )
    gold = (ROOT / "src/transformations/03_gold.py").read_text(
        encoding="utf-8"
    )
    assert "readStream" in bronze
    assert "cloudFiles" in bronze
    assert "readStream.table" in silver
    assert "expect_or_fail" in silver
    assert "expect_or_drop" in silver
    assert "@dp.expect(" in silver
    assert gold.count("@dp.materialized_view") == 4
    assert "expect_or_fail" in gold


def test_dashboard_has_four_distinct_visualizations():
    dashboard = json.loads(
        (ROOT / "dashboard/dashboard_gold.lvdash.json").read_text(
            encoding="utf-8"
        )
    )
    types = {
        item["widget"]["spec"]["widgetType"]
        for page in dashboard["pages"]
        for item in page["layout"]
        if "spec" in item["widget"]
    }
    assert {"counter", "bar", "line", "table"}.issubset(types)
