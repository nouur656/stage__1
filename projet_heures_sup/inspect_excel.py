import pandas as pd
import sys

# Fix encoding for Windows console
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print('=== Fichier: جدول الدعم التربوي الممتد 2026.xlsx ===')
try:
    xls = pd.ExcelFile('جدول الدعم التربوي الممتد 2026.xlsx')
    print('Feuilles:', xls.sheet_names)
    for sheet in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet, nrows=5)
        print(f'\nFeuille [{sheet}]:')
        print('Colonnes:', list(df.columns))
        print(df.to_string())
except Exception as e:
    print('Erreur:', e)

print('\n\n=== Fichier PRI (5 premieres lignes) ===')
try:
    df_pri = pd.read_excel('1+2+3+4 PRI.xlsx', nrows=5)
    print('Colonnes:', list(df_pri.columns))
    print(df_pri.to_string())
except Exception as e:
    print('Erreur:', e)

print('\n\n=== Fichier COLLEGE (5 premieres lignes) ===')
try:
    df_col = pd.read_excel('1+2+3+4 COLLEGE.xlsx', nrows=5)
    print('Colonnes:', list(df_col.columns))
    print(df_col.to_string())
except Exception as e:
    print('Erreur:', e)
