"""
Importer les bases Excel de reference dans PostgreSQL.

Avant de lancer :
  pip install pandas openpyxl sqlalchemy psycopg[binary]

Le mot de passe par defaut ci-dessous est celui defini pour le compte "postgres".
Tu peux aussi le fournir via une variable d'environnement PGPASSWORD si tu preferes.
"""

import os
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

BASE_DIR = Path(__file__).resolve().parent

# --- Connexion a la base PostgreSQL ---
# format : postgresql+psycopg://utilisateur:mot_de_passe@hote:port/nom_base
DB_USER = os.getenv("PGUSER", "postgres")
DB_PASSWORD = os.getenv("PGPASSWORD", "badarybadary123")
DB_HOST = os.getenv("PGHOST", "localhost")
DB_PORT = os.getenv("PGPORT", "5432")
DB_NAME = os.getenv("PGDATABASE", "heures_supplementaires")

engine = create_engine(
    f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    connect_args={"client_encoding": "utf8"},
)

try:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    print("Connexion PostgreSQL OK")
except SQLAlchemyError as exc:
    raise SystemExit(
        "Connexion PostgreSQL impossible. Verifie le mot de passe, l'utilisateur et que la base existe. "
        f"Details: {exc}"
    ) from exc

# 1) Base "Personnel" (reference enseignants : PPR = code S.O.M, CIN, grade...)
personnel_file = BASE_DIR / "PERSONNEL_17052026_TOTAL2 (3).xlsx"
personnel = pd.read_excel(personnel_file)
personnel.to_sql("personnel", engine, if_exists="replace", index=False)
print(f"Table 'personnel' importee : {len(personnel)} lignes")

# 2) Base "Etablissements publics" : une feuille par cycle
xls = pd.ExcelFile(BASE_DIR / "المؤسسات العمومية 25-26.xlsx")
etabs = []
for feuille, cycle in [("الابتدائي", "PRIMAIRE"), ("الاعدادي", "COLLEGE"), ("التأهيلي", "LYCEE")]:
    df = pd.read_excel(xls, sheet_name=feuille)
    df["cycle"] = cycle
    etabs.append(df)
etablissements = pd.concat(etabs, ignore_index=True)
etablissements.to_sql("etablissements", engine, if_exists="replace", index=False)
print(f"Table 'etablissements' importee : {len(etablissements)} lignes")

print("Import termine avec succes.")
