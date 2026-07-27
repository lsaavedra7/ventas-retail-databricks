-- Proyecto final Databricks: infraestructura Unity Catalog
-- Cambie este valor si el workspace exige utilizar otro catálogo.
-- Use el mismo nombre con: databricks bundle ... --var "catalog=<nombre>"

DECLARE OR REPLACE VARIABLE project_catalog STRING DEFAULT 'dbassociate';

CREATE CATALOG IF NOT EXISTS IDENTIFIER(project_catalog)
COMMENT 'Proyecto final end-to-end de ventas retail de Luis Enrique Saavedra Jaimes';

CREATE SCHEMA IF NOT EXISTS IDENTIFIER(project_catalog || '.landing')
COMMENT 'Zona de aterrizaje de archivos crudos';

CREATE SCHEMA IF NOT EXISTS IDENTIFIER(project_catalog || '.bronze')
COMMENT 'Tablas streaming crudas administradas por Lakeflow';

CREATE SCHEMA IF NOT EXISTS IDENTIFIER(project_catalog || '.silver')
COMMENT 'Tablas streaming limpias, tipadas y validadas';

CREATE SCHEMA IF NOT EXISTS IDENTIFIER(project_catalog || '.gold')
COMMENT 'Modelo dimensional de consumo BI';

CREATE VOLUME IF NOT EXISTS IDENTIFIER(project_catalog || '.landing.raw_data')
COMMENT 'Archivos CSV y JSON del proyecto de ventas retail';

-- Ruta raíz resultante:
-- /Volumes/<project_catalog>/landing/raw_data/ventas_retail_luissaavedra/
