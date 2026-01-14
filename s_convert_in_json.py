import pandas as pd
import json
from pathlib import Path
from functools import lru_cache

BASE_DIR = Path(__file__).resolve().parent

EXCEL_FILE = BASE_DIR / "GEOFINDER_excel.xlsx"
DATA_DIR = BASE_DIR / "data"

OUT_STUDENT = DATA_DIR / "tasks.json"
OUT_TEACHER = DATA_DIR / "tasks_private.json"

STUDENT_FLAG_COLUMN = "student"
STUDENT_TRUE_VALUE = "T"

TASK_SRC_COL = "html"
ATT1_SRC_COL = "att1_src"
ATT2_SRC_COL = "att2_src"

def save_json(data, filename: Path):
    filename.parent.mkdir(parents=True, exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, allow_nan=False)

def norm_cell(x) -> str:
    if x is None:
        return ""
    return str(x).strip().replace("\\", "/")

def resolve_project_file(cell_value: str) -> Path | None:
    """
    Excel ma ścieżki webowe typu:
      ../tasks/....
      ../tasks_private/....
      ../attachment/....
      attachment_private/....
    a na dysku masz foldery projektu: tasks/, tasks_private/, attachment/, attachment_private/.
    """
    s = norm_cell(cell_value)
    if not s:
        return None

    name = Path(s).name  # tylko nazwa pliku

    # mapowanie po tym, co występuje w ścieżce webowej
    if "tasks_private/" in s:
        return (BASE_DIR / "tasks_private" / name).resolve()
    if "tasks/" in s:
        return (BASE_DIR / "tasks" / name).resolve()
    if "attachment_private/" in s:
        return (BASE_DIR / "attachment_private" / name).resolve()
    if "attachment/" in s:
        return (BASE_DIR / "attachment" / name).resolve()

    # fallback: traktuj jako relatywne do folderu skryptu
    return (BASE_DIR / s).resolve()

@lru_cache(maxsize=200_000)
def exists_cached(p: str) -> bool:
    return Path(p).is_file()

def exists_from_cell(cell_value) -> bool:
    p = resolve_project_file(cell_value)
    if p is None:
        return False
    return exists_cached(str(p))

def row_is_valid(row) -> tuple[bool, str]:
    # zadanie musi istnieć
    if not exists_from_cell(row.get(TASK_SRC_COL)):
        return False, "missing_task"

    # att1 jeśli podane → musi istnieć
    a1 = norm_cell(row.get(ATT1_SRC_COL))
    if a1 and not exists_from_cell(a1):
        return False, "missing_att1"

    # att2 jeśli podane → musi istnieć
    a2 = norm_cell(row.get(ATT2_SRC_COL))
    if a2 and not exists_from_cell(a2):
        return False, "missing_att2"

    return True, ""

# ===== START =====
DATA_DIR.mkdir(parents=True, exist_ok=True)

print("BASE_DIR:", BASE_DIR)
print("OUT_TEACHER:", OUT_TEACHER.resolve())
print("OUT_STUDENT:", OUT_STUDENT.resolve())

df = pd.read_excel(EXCEL_FILE)
df = df.astype(object).where(pd.notnull(df), None)

valid_info = df.apply(row_is_valid, axis=1)
df["_valid"] = [v[0] for v in valid_info]
df["_reason"] = [v[1] for v in valid_info]

print("Wszystkich rekordów:", len(df))
print("Poprawnych rekordów:", int(df["_valid"].sum()))
print("Odrzuconych rekordów:", int((~df["_valid"]).sum()))
if (~df["_valid"]).any():
    print("Powody odrzuceń:")
    print(df.loc[~df["_valid"], "_reason"].value_counts().to_string())

df_valid = df[df["_valid"]].drop(columns=["_valid", "_reason"])

# teacher
teacher_data = df_valid.to_dict(orient="records")
save_json(teacher_data, OUT_TEACHER)

# student
student_df = df_valid[df_valid[STUDENT_FLAG_COLUMN] == STUDENT_TRUE_VALUE]
student_data = student_df.to_dict(orient="records")
save_json(student_data, OUT_STUDENT)

print("✔ Zapisane.")
print("Teacher len:", len(teacher_data))
print("Student len:", len(student_data))
