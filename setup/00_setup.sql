-- Proyecto final Databricks: infraestructura Unity Catalog
-- Nombres alineados con los valores por defecto de databricks.yml.

CREATE CATALOG IF NOT EXISTS dbassociate
COMMENT 'Proyecto final end-to-end de ventas retail de Luis Enrique Saavedra Jaimes';

CREATE SCHEMA IF NOT EXISTS dbassociate.landing
COMMENT 'Zona de aterrizaje de archivos crudos';

CREATE SCHEMA IF NOT EXISTS dbassociate.bronze
COMMENT 'Tablas streaming crudas administradas por Lakeflow';

CREATE SCHEMA IF NOT EXISTS dbassociate.silver
COMMENT 'Tablas streaming limpias, tipadas y validadas';

CREATE SCHEMA IF NOT EXISTS dbassociate.gold
COMMENT 'Modelo dimensional de consumo BI';

CREATE VOLUME IF NOT EXISTS dbassociate.landing.raw_data
COMMENT 'Archivos CSV y JSON del proyecto de ventas retail';

-- Ruta raíz resultante:
-- /Volumes/dbassociate/landing/raw_data/ventas_retail_luissaavedra/
