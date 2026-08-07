import pandas as pd
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Le fichier جدول الدعم has data starting from row 4 (index 4)
# Let's read it properly
print('=== جدول الدعم التربوي الممتد 2026.xlsx - Feuille 1 ===')
try:
    df = pd.read_excel('جدول الدعم التربوي الممتد 2026.xlsx', sheet_name='الجدول1', header=4)
    print(f'Lignes totales: {len(df)}')
    print('Colonnes:', list(df.columns))
    # Show first 10 non-empty rows
    df_clean = df.dropna(how='all')
    print(f'Lignes non vides: {len(df_clean)}')
    print('\nApercu 10 premieres lignes:')
    print(df_clean.head(10).to_string())
except Exception as e:
    print('Erreur:', e)

print('\n\n=== 1+2+3+4 PRI.xlsx - structure ===')
try:
    # Try reading from different rows to find actual data
    for skip in [0, 5, 6, 7, 8, 9, 10]:
        df = pd.read_excel('1+2+3+4 PRI.xlsx', skiprows=skip, nrows=3)
        non_null = df.dropna(how='all').dropna(axis=1, how='all')
        if len(non_null) > 0 and not all(str(c).startswith('Unnamed') for c in non_null.columns):
            print(f'  -> Donnees trouvees a skiprows={skip}')
            print('  Colonnes:', list(non_null.columns))
            print(non_null.head(3).to_string())
            break
        elif len(non_null) > 0:
            first_row = non_null.iloc[0].dropna()
            if len(first_row) > 2:
                print(f'  -> skiprows={skip}: premiere ligne = {list(first_row.values)[:5]}')
except Exception as e:
    print('Erreur PRI:', e)

print('\n== Lecture avec header explicite - PRI ===')
try:
    # Read all rows to find where data starts
    df_all = pd.read_excel('1+2+3+4 PRI.xlsx', header=None)
    print(f'Shape total: {df_all.shape}')
    # Find first row with at least 5 non-null values
    for i, row in df_all.iterrows():
        non_null_count = row.count()
        if non_null_count >= 5:
            print(f'  Ligne {i} ({non_null_count} valeurs): {list(row.dropna().values)[:8]}')
        if i > 20:
            break
except Exception as e:
    print('Erreur:', e)
