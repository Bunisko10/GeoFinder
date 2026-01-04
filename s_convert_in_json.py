import pandas as pd
import json
import os
# ======================
# USTAWIENIA
# ======================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

EXCEL_FILE = os.path.join(BASE_DIR, "GEOFINDER_index.xlsx")
DATA_DIR = os.path.join(BASE_DIR, "data")

OUT_STUDENT = os.path.join(DATA_DIR, "tasks.json")
OUT_TEACHER = os.path.join(DATA_DIR, "tasks_private.json")

STUDENT_FLAG_COLUMN = "student"
STUDENT_TRUE_VALUE = "T"

# ======================
# POMOCNICZE
# ======================

def save_json(data, filename):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2,
            allow_nan=False   # ← wymusza poprawny JSON
        )

# ======================
# START
# ======================

# upewnij się, że folder /data istnieje
os.makedirs(DATA_DIR, exist_ok=True)

# wczytaj excela
df = pd.read_excel(EXCEL_FILE)

# KLUCZOWE: zamień NaN → None (czyli null w JSON)
df = df.astype(object).where(pd.notnull(df), None)

# ===== NAUCZYCIEL: WSZYSTKO =====
teacher_data = df.to_dict(orient="records")
save_json(teacher_data, OUT_TEACHER)

# ===== STUDENT: TYLKO student == "T" =====
student_df = df[df[STUDENT_FLAG_COLUMN] == STUDENT_TRUE_VALUE]
student_data = student_df.to_dict(orient="records")
save_json(student_data, OUT_STUDENT)

# ===== INFO =====
print("✔ Generowanie zakończone")
print(f"  - nauczyciel: {len(teacher_data)} zadań → {OUT_TEACHER}")
print(f"  - student:    {len(student_data)} zadań → {OUT_STUDENT}")
