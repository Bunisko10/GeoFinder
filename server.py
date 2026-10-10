from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
import json
import re
import os
import zipfile
import io
import qrcode
import base64
from flask import send_file



APP = Flask(__name__)

# ROOT musi brać się z env (dla EXE onefile), a jak nie ma env → fallback do folderu pliku
ROOT = Path(os.environ.get("GEOFINDER_ROOT", str(Path(__file__).resolve().parent)))

print("ROOT =", ROOT)
print("CWD  =", Path().resolve())

def get_paths(target: str):
    
    target = (target or "private").lower()
    if target not in ("private", "public"):
        target = "private"

    data_json = ROOT / "data" / ("tasks.json" if target == "public" else "tasks_private.json")
    tasks_dir = ROOT / ("tasks_public" if target == "public" else "tasks_private")
    att_dir   = ROOT / ("attachment_public" if target == "public" else "attachment_private")
    img_dir   = ROOT / ("img_public" if target == "public" else "img_private")

    for p in [tasks_dir, att_dir, img_dir, data_json.parent]:
        p.mkdir(parents=True, exist_ok=True)
    if not data_json.exists():
        data_json.write_text("[]", encoding="utf-8")

    return data_json, tasks_dir, att_dir, img_dir, target


# DOPASUJ do swojej struktury:
#DATA_JSON = ROOT / "data" / "tasks_private.json"
#TASKS_DIR = ROOT / "tasks_private"
#ATT_DIR   = ROOT / "attachment_private"
#IMG_DIR   = ROOT / "img_private"


def rel_paths(target: str):
    t = "public" if target == "public" else "private"
    return {
        "tasks": f"../tasks_{t}",
        "att":   f"../attachment_{t}",
        "img":   f"../img_{t}",
    }


def norm(v):
    if v is None:
        return ""
    s = str(v).strip()
    if s in ("null", "0000", ""):
        return ""
    return s

def slug(s: str) -> str:
    s = (s or "").strip()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^A-Za-z0-9_ĄąĆćĘęŁłŃńÓóŚśŹźŻż-]", "", s)
    return s

def parse_nr_zad(nr: str):
    """
    "10.1" -> ("10","1"), "27" -> ("27","0")
    """
    nr = (nr or "").strip()
    if not nr:
        return ("00", "0")
    if "." in nr:
        a,b = nr.split(".", 1)
        return (a.strip(), b.strip() or "0")
    return (nr, "0")

def make_sheet_prefix(src_key: str, formula: str, poziom: str, rok: str, miesiac: str) -> str:
    yy = formula[-2:] if formula else "XX"
    lvl = "R" if "Rozszerz" in (poziom or "") else "P"
    return f"{src_key}{yy}{lvl}_{rok}_{miesiac}"


def build_task_id(meta: dict, data_json: Path) -> str:
    src_key = norm(meta.get("zrodlo_key", "INNE"))
    formula = norm(meta.get("formula"))
    poziom  = norm(meta.get("poziom"))
    rok     = norm(meta.get("rok"))
    miesiac = norm(meta.get("miesiac"))
    nr_zad  = norm(meta.get("nr_zad"))

    # arkusze typu matura (CKE_*, NER_M, OPE_M itd.)
    if src_key.startswith(("CKE_", "NER_M", "OPE_M")):
        sheet = make_sheet_prefix(src_key, formula, poziom, rok, miesiac)
        main, sub = parse_nr_zad(nr_zad)          # 29.2 -> ("29","2")
        return f"{sheet}_Z{main}_{sub}"

    # INNE
    prefix = src_key if src_key not in ("INNE",) else "INNE"
    dzial = slug(meta.get("dzial_1") or "Zadania")
    tasks = json.loads(data_json.read_text(encoding="utf-8"))
    pat = re.compile(rf"^{re.escape(prefix)}_{re.escape(dzial)}_(\d{{3}})_0$")
    nums = [int(m.group(1)) for t in tasks if (m := pat.match(str(t.get("id",""))))]
    nxt = (max(nums) + 1) if nums else 1
    return f"{prefix}_{dzial}_{nxt:03d}_0"

def bundle_attachment_base_id(meta: dict) -> str:
    """
    Dla 29.1 / 29.2 / 29.3 -> wspólny base: <sheet>_Z29
    """
    src_key = norm(meta.get("zrodlo_key", "INNE"))
    formula = norm(meta.get("formula"))
    poziom  = norm(meta.get("poziom"))
    rok     = norm(meta.get("rok"))
    miesiac = norm(meta.get("miesiac"))
    nr_zad  = norm(meta.get("nr_zad"))

    sheet = make_sheet_prefix(src_key, formula, poziom, rok, miesiac)
    main, _sub = parse_nr_zad(nr_zad)
    return f"{sheet}_Z{main}"


def make_task_html(full_title: str, body_html: str, solution_html: str) -> str:
    # To jest pełny plik zadania w Twoim stylu (meta-placeholder zostawiamy!)
    return f"""<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>{full_title}</title>
  <link rel="stylesheet" href="../style.css">
</head>
<body>

<h1>{full_title}</h1>

<div class="meta">
  <span class="meta-placeholder" data-meta="zrodlo"></span>
  <span class="meta-placeholder" data-meta="rok"></span>
  <span class="meta-points"><span class="meta-placeholder" data-meta="l_pkt"></span></span>
  <span class="meta-placeholder" data-meta="kompetencje"></span>
</div>

{body_html}

<details class="solution">
  <summary>Pokaż rozwiązanie</summary>
  <div class="solution-content">
    {solution_html}
  </div>
</details>

</body>
</html>"""

def make_attachment_wrapper(img_rel_src: str, alt_text: str, intro_html: str = "") -> str:
    alt_text = (alt_text or "").replace('"', "'")
    intro_html = intro_html or ""

    return f"""<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Załącznik</title>
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <div class="task-intro">
    {intro_html}
    <div class="attachment">
      <img src="{img_rel_src}" alt="{alt_text}">
    </div>
  </div>
</body>
</html>"""

def bundle_base_id(meta: dict) -> str:
    """
    Z meta (rok/miesiac/formula/poziom/nr_zad) robi bazę załącznika dla wiązki:
    np. ..._Z29  (bez _2/_3)
    """
    src_key = norm(meta.get("zrodlo_key", "INNE"))
    formula = norm(meta.get("formula"))
    poziom  = norm(meta.get("poziom"))
    rok     = norm(meta.get("rok"))
    miesiac = norm(meta.get("miesiac"))
    nr_zad  = norm(meta.get("nr_zad"))

    # arkusz (prefix) – tak jak w build_task_id
    yy = formula[-2:] if formula else "XX"
    lvl = "R" if "Rozszerz" in (poziom or "") else "P"

    # numer główny zadania: 29.2 -> 29
    main, _sub = parse_nr_zad(nr_zad)

    # baza dla załącznika: np. CKE_M23R_2024_maj_Z29
    return f"{src_key}{yy}{lvl}_{rok}_{miesiac}_Z{main}"

@APP.route("/teacher_qr_code")
def show_teacher_qr():
    local_url = "http://192.168.1.17:5000"

    img = qrcode.make(local_url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()

    # Zwracamy pełną, ostylowaną stronę HTML
    return f"""
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>GeoFinder - Kod QR</title>
    <link rel="stylesheet" href="/style_git.css"> 
    <!-- Ścieżka do Twojego głównego pliku CSS -->
</head>
<body>
    <div class="container qr-page">
        <header>
            <h1>GeoFinder</h1>
            <p>Szybkie udostępnianie testu uczniom.</p>
        </header>
        
        <main class="qr-container">
            <h2>Zeskanuj kod, aby dołączyć do testu:</h2>
            <!-- Tutaj jest Twój obrazek QR -->
            <img src="data:image/png;base64,{img_str}" alt="Kod QR do generatora">
            <p class="hint">Adres IP: {local_url}</p>
        </main>

    </div>
</body>
</html>
"""




@APP.route("/api/save_task", methods=["POST"])
def save_task():
    target = request.args.get("target", "private")
    DATA_JSON, TASKS_DIR, ATT_DIR, IMG_DIR, target = get_paths(target)
    R = rel_paths(target)
    try:
        meta_json = request.form.get("meta", "{}")
        body_html = request.form.get("body_html", "")
        solution_html = request.form.get("solution_html", "")

        meta = json.loads(meta_json)

        # debug info (pomaga, jak coś nie dochodzi)
        print("SAVE_TASK HIT")
        print("form keys:", list(request.form.keys()))
        print("files:", list(request.files.keys()))

        zrodlo_text = meta.get("zrodlo_text") or "inne"
        meta["zrodlo"] = zrodlo_text

        task_id = build_task_id(meta, DATA_JSON)


        full_title = meta.get("auto_title") or f"Zadanie {task_id}"
        html_text = make_task_html(full_title, body_html, solution_html)
        task_path = TASKS_DIR / f"{task_id}.html"
        task_path.write_text(html_text, encoding="utf-8")

        def handle_att(which: str):
            f = request.files.get(f"{which}_file")
            att_type = request.form.get(f"{which}_type") or None
            desc = request.form.get(f"{which}_desc") or ""
            intro = request.form.get(f"{which}_intro", "") or ""

            # ID wspólne dla wiązki (tu użyj swojej funkcji bundle_base_id/meta)
            bundle_id = bundle_base_id(meta)  # np. CKE_M23R_2024_maj_Z29
            att_id = f"{bundle_id}_000" if which == "att1" else f"{bundle_id}_001"
            wrapper_path = ATT_DIR / f"{att_id}.html"
            src = f"{R['att']}/{att_id}.html"

            # 1) brak uploadu -> jeśli wrapper istnieje, to reuse
            if (not f) or (f.filename == ""):
                if wrapper_path.exists():
                    return (att_id, att_type or "img", src)
                return (None, None, None)

            ext = Path(f.filename).suffix.lower()

            # 2) upload .html -> traktuj jako gotowy wrapper
            if ext == ".html":
                f.save(wrapper_path)
                return (att_id, att_type or "img", src)

            # 3) upload obrazka -> zapis obrazka + generowanie wrappera
            if ext in (".png", ".jpg", ".jpeg", ".webp"):
                img_name = f"{att_id}{ext}"
                img_path = IMG_DIR / img_name
                f.save(img_path)

                wrapper_html = make_attachment_wrapper(
                    f"{R['img']}/{img_name}",
                    desc,
                    intro_html=intro
                )
                wrapper_path.write_text(wrapper_html, encoding="utf-8")

                return (att_id, att_type or "img", src)

            # 4) inny typ -> odrzuć
            return (None, None, None)


        att1_id, att1_type, att1_src = handle_att("att1")
        att2_id, att2_type, att2_src = handle_att("att2")

        record = {
          "id": task_id,
          "dzial_1": meta.get("dzial_1"),
          "dzial_2": meta.get("dzial_2"),
          "zrodlo": meta.get("zrodlo"),
          "formula": meta.get("formula") or None,
          "poziom": meta.get("poziom") or None,
          "l_pkt": int(meta.get("l_pkt") or 0),
          "rok": int(meta["rok"]) if meta.get("rok") else None,
          "miesiac": meta.get("miesiac") or None,
          "zagadnienie": meta.get("zagadnienie") or None,
          "typ": meta.get("typ") or None,
          "kompetencja_1": meta.get("kompetencja_1"),
          "kompetencja_2": meta.get("kompetencja_2"),
          "praca_z_topo": meta.get("praca_z_topo"),
          "praca_z_mapa": meta.get("praca_z_mapa"),
          "praca_z_tekstem_zrodlowym": meta.get("praca_z_tekstem_zrodlowym"),
          "praca_z_wykresem": meta.get("praca_z_wykresem"),
          "czas_min": int(meta.get("czas_min") or 0),
          "czas_max": int(meta.get("czas_max") or 0),
          "strona": int(meta["strona"]) if meta.get("strona") else None,
          "nr_zad": meta.get("nr_zad"),
          "html": f"{R['tasks']}/{task_id}.html",
          "if_att": "T" if (att1_id or att2_id) else "N",
          "att1_id": att1_id,
          "att1_type": att1_type,
          "att1_src": att1_src,
          "att2_id": att2_id,
          "att2_type": att2_type,
          "att2_src": att2_src,
          "student": meta.get("student") or "N",
          "uwagi": meta.get("uwagi"),
          "podstawa_programowa_1": meta.get("pp1"),
          "podstawa_programowa_2": meta.get("pp2"),
          "podstawa_programowa_3": meta.get("pp3"),
          "podstawa_programowa_4": meta.get("pp4"),
          "podstawa_programowa_5": meta.get("pp5"),
          "podstawa_programowa_6": meta.get("pp6"),
          "DO_uzup": meta.get("DO_uzup")
        }

        tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))
        tasks.append(record)
        DATA_JSON.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")

        return jsonify({"ok": True, "id": task_id, "html": record["html"]})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500

@APP.route("/api/import_package", methods=["POST"])
def import_package():
    from pathlib import PurePosixPath
    import copy

    target = request.args.get("target", "private")

    if target not in ("private", "public"):
        return jsonify({
            "ok": False,
            "error": "Nieprawidłowa baza."
        }), 400

    DATA_JSON, TASKS_DIR, ATT_DIR, IMG_DIR, target = get_paths(target)

    upload = request.files.get("package")

    if not upload or not upload.filename:
        return jsonify({
            "ok": False,
            "error": "Wybierz plik ZIP."
        }), 400

    # ---------- Walidacja identyfikatorów ----------

    def safe_id(raw):
        text = str(raw or "").strip()

        allowed = r"[A-Za-z0-9_ĄąĆćĘęŁłŃńÓóŚśŹźŻż.-]+"

        if (
            not re.fullmatch(allowed, text)
            or text in (".", "..")
        ):
            raise ValueError(
                "Nieprawidłowe ID zadania lub załącznika."
            )

        return text

    # ---------- Dopasowanie ścieżek w HTML ----------

    def rewrite_paths(text):
        pattern = (
            r"""((?:src|href|data-src)\s*=\s*["'])"""
            r"""([^"']+)"""
            r"""(["'])"""
        )

        def replace(match):
            url = match.group(2)

            def replace_folder(folder_match):
                folder = folder_match.group(1).lower()

                folder = {
                    "task": "tasks",
                    "att": "attachment"
                }.get(folder, folder)

                return f"../{folder}_{target}/"

            url = re.sub(
                r"^(?:\.\./|\./|/)?"
                r"(tasks|task|attachment|att|img)"
                r"(?:_private|_public)?/",
                replace_folder,
                url,
                flags=re.IGNORECASE
            )

            return (
                match.group(1)
                + url
                + match.group(3)
            )

        return re.sub(
            pattern,
            replace,
            text,
            flags=re.IGNORECASE
        )

    try:
        # ---------- Wczytanie ZIP ----------

        max_zip_size = 50 * 1024 * 1024
        max_unpacked_size = 200 * 1024 * 1024

        raw = upload.read(max_zip_size + 1)

        if len(raw) > max_zip_size:
            raise ValueError(
                "Paczka ZIP przekracza 50 MB."
            )

        # Najpierw przygotowujemy wszystkie dane.
        # Zapis następuje dopiero po walidacji.
        staged = {}

        with zipfile.ZipFile(io.BytesIO(raw), "r") as archive:
            infos = archive.infolist()

            if (
                len(infos) > 5000
                or sum(info.file_size for info in infos)
                > max_unpacked_size
            ):
                raise ValueError(
                    "Paczka zawiera zbyt wiele danych."
                )

            members = {}

            for info in infos:
                name = info.filename.replace("\\", "/")
                path = PurePosixPath(name)

                if path.is_absolute() or ".." in path.parts:
                    raise ValueError(
                        "Paczka zawiera nieprawidłową ścieżkę."
                    )

                if info.is_dir():
                    continue

                if name in members:
                    raise ValueError(
                        "Paczka zawiera powtórzone nazwy plików."
                    )

                members[name] = info

            # ---------- Metadane ----------

            if "meta/tasks.json" in members:
                # Eksport zbiorczy.
                records = json.loads(
                    archive.read(
                        members["meta/tasks.json"]
                    ).decode("utf-8-sig")
                )

            elif "meta.json" in members:
                # Eksport pojedynczego zadania.
                records = json.loads(
                    archive.read(
                        members["meta.json"]
                    ).decode("utf-8-sig")
                )

                if isinstance(records, dict):
                    records = [records]

            else:
                raise ValueError(
                    "Brak meta.json lub meta/tasks.json."
                )

            if (
                not isinstance(records, list)
                or not records
                or any(
                    not isinstance(record, dict)
                    for record in records
                )
            ):
                raise ValueError(
                    "Nieprawidłowe metadane paczki."
                )

            records = copy.deepcopy(records)

            ids = [
                safe_id(record.get("id"))
                for record in records
            ]

            if len(ids) != len(set(ids)):
                raise ValueError(
                    "Powtórzone ID zadań w paczce."
                )

            # ---------- Przygotowanie plików ----------

            def stage_file(
                folders,
                filename,
                destination,
                html=False,
                required=True
            ):
                candidates = [
                    members[f"{folder}/{filename}"]
                    for folder in folders
                    if f"{folder}/{filename}" in members
                ]

                if len(candidates) > 1:
                    raise ValueError(
                        "Niejednoznaczny plik w paczce: "
                        + filename
                    )

                if not candidates:
                    if required:
                        raise ValueError(
                            "Brak pliku w paczce: "
                            + filename
                        )

                    return False

                content = archive.read(candidates[0])

                if html:
                    content = rewrite_paths(
                        content.decode("utf-8-sig")
                    ).encode("utf-8")

                if (
                    destination in staged
                    and staged[destination] != content
                ):
                    raise ValueError(
                        "Konflikt plików w paczce: "
                        + filename
                    )

                staged[destination] = content
                return True

            for record, task_id in zip(records, ids):
                record["id"] = task_id

                stage_file(
                    (
                        "tasks",
                        "task",
                        "tasks_private",
                        "tasks_public"
                    ),
                    f"{task_id}.html",
                    TASKS_DIR / f"{task_id}.html",
                    html=True
                )

                record["html"] = (
                    f"../tasks_{target}/{task_id}.html"
                )

                for which in ("att1", "att2"):
                    att_id = record.get(f"{which}_id")

                    if not att_id:
                        record[f"{which}_id"] = None
                        record[f"{which}_src"] = None
                        record[f"{which}_type"] = None
                        continue

                    att_id = safe_id(att_id)

                    stage_file(
                        (
                            "attachment",
                            "att",
                            "attachment_private",
                            "attachment_public"
                        ),
                        f"{att_id}.html",
                        ATT_DIR / f"{att_id}.html",
                        html=True
                    )

                    for ext in (
                        ".png",
                        ".jpg",
                        ".jpeg",
                        ".webp"
                    ):
                        stage_file(
                            (
                                "img",
                                "img_private",
                                "img_public"
                            ),
                            f"{att_id}{ext}",
                            IMG_DIR / f"{att_id}{ext}",
                            required=False
                        )

                    record[f"{which}_id"] = att_id

                    record[f"{which}_src"] = (
                        f"../attachment_{target}/{att_id}.html"
                    )

                record["if_att"] = (
                    "T"
                    if (
                        record.get("att1_id")
                        or record.get("att2_id")
                    )
                    else "N"
                )

        # ---------- Połączenie z bazą ----------

        tasks = json.loads(
            DATA_JSON.read_text(encoding="utf-8-sig")
        )

        if (
            not isinstance(tasks, list)
            or any(
                not isinstance(task, dict)
                for task in tasks
            )
        ):
            raise RuntimeError(
                "Baza JSON ma nieprawidłową strukturę."
            )

        existing_ids = {
            str(task.get("id"))
            for task in tasks
        }

        updated_count = sum(
            task_id in existing_ids
            for task_id in ids
        )

        imported = dict(zip(ids, records))

        result = [
            imported.get(str(task.get("id")), task)
            for task in tasks
        ]

        result.extend(
            record
            for task_id, record in imported.items()
            if task_id not in existing_ids
        )

        # JSON zapisujemy po plikach zadania i załączników.
        staged[DATA_JSON] = json.dumps(
            result,
            ensure_ascii=False,
            indent=2
        ).encode("utf-8")

        # ---------- Zapis z przywracaniem po błędzie ----------

        backups = {
            path: (
                path.read_bytes()
                if path.exists()
                else None
            )
            for path in staged
        }

        written = []

        try:
            for path, content in staged.items():
                written.append(path)
                path.write_bytes(content)

        except OSError:
            for path in reversed(written):
                previous = backups[path]

                if previous is None:
                    path.unlink(missing_ok=True)
                else:
                    path.write_bytes(previous)

            raise

        # ---------- Wynik ----------

        return jsonify({
            "ok": True,
            "task_id": ids[0] if len(ids) == 1 else None,
            "task_ids": ids,
            "imported_count": len(ids),
            "created_count": len(ids) - updated_count,
            "updated_count": updated_count,
            "skipped": False
        })

    except (
        ValueError,
        UnicodeError,
        zipfile.BadZipFile,
        RuntimeError
    ) as exc:
        return jsonify({
            "ok": False,
            "error": str(exc)
        }), 400

    except Exception:
        APP.logger.exception(
            "Błąd importu paczki GeoFinder"
        )

        return jsonify({
            "ok": False,
            "error": (
                "Nie udało się zaimportować paczki. "
                "Sprawdź konsolę serwera."
            )
        }), 500


@APP.route("/api/export_task/<task_id>")
def export_task(task_id):
    target = request.args.get("target", "private")
    DATA_JSON, TASKS_DIR, ATT_DIR, IMG_DIR, target = get_paths(target)

    tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    task_data = next((t for t in tasks if str(t.get("id")) == task_id), None)
    if not task_data:
        return jsonify({"ok": False, "error": "not found"}), 404

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("meta.json", json.dumps(task_data, ensure_ascii=False, indent=2))

        # task html
        html_path = TASKS_DIR / f"{task_id}.html"
        if html_path.exists():
            z.write(html_path, arcname=f"tasks/{task_id}.html")

        # attachments wrappers + images (jeśli są)
        for which in ("att1", "att2"):
            att_id = task_data.get(f"{which}_id")
            if not att_id:
                continue

            wrapper = ATT_DIR / f"{att_id}.html"
            if wrapper.exists():
                z.write(wrapper, arcname=f"attachment/{att_id}.html")

            # obrazek dowolnego formatu
            for ext in (".png", ".jpg", ".jpeg", ".webp"):
                img = IMG_DIR / f"{att_id}{ext}"
                if img.exists():
                    z.write(img, arcname=f"img/{att_id}{ext}")
                    break

    memory_file.seek(0)
    return send_file(
        memory_file,
        as_attachment=True,
        download_name=f"{task_id}.geofinder.zip",
        mimetype="application/zip",
    )



print("META_SUGGESTIONS ROUTE LOADED")

@APP.get("/api/meta_suggestions")
def meta_suggestions():
    # bierzemy z DATA_JSON (Twoje tasks_private.json)
    target = request.args.get("target", "private")
    DATA_JSON, TASKS_DIR, ATT_DIR, IMG_DIR, target = get_paths(target)

    tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))

    dzialy = set()
    zagadnienia = set()
    kompetencje = set()

    def add_set(s, val):
        if not val:
            return
        v = str(val).strip()
        if v:
            s.add(v)

    for t in tasks:
        add_set(dzialy, t.get("dzial_1"))
        add_set(dzialy, t.get("dzial_2"))
        add_set(zagadnienia, t.get("zagadnienie"))

        # masz kompetencja_1 / _2
        add_set(kompetencje, t.get("kompetencja_1"))
        add_set(kompetencje, t.get("kompetencja_2"))

        # jeśli kiedyś dodasz listę "kompetencje": [...]
        if isinstance(t.get("kompetencje"), list):
            for k in t["kompetencje"]:
                add_set(kompetencje, k)

    # sortowanie PL-ish
    out = {
        "dzialy": sorted(dzialy, key=lambda x: x.lower()),
        "zagadnienia": sorted(zagadnienia, key=lambda x: x.lower()),
        "kompetencje": sorted(kompetencje, key=lambda x: x.lower()),
    }
    return jsonify(out)



@APP.post("/api/reset_attachments")
def reset_attachments():
    target = request.args.get("target", "private")
    DATA_JSON, TASKS_DIR, ATT_DIR, IMG_DIR, target = get_paths(target)

    mode = (request.get_json(silent=True) or {}).get("mode", "soft")

    # 1) usuń pliki
    removed_files = 0
    for folder in [ATT_DIR, IMG_DIR]:
        if folder.exists():
            for p in folder.iterdir():
                if p.is_file():
                    p.unlink(missing_ok=True)
                    removed_files += 1

    # 2) hard reset: wyczyść pola w JSON
    changed = 0
    if mode == "hard":
       
        tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))

        for t in tasks:
            # jeśli cokolwiek było ustawione -> wyzeruj
            if t.get("if_att") == "T" or t.get("att1_id") or t.get("att2_id"):
                t["if_att"] = "N"
                t["att1_id"] = None
                t["att1_type"] = None
                t["att1_src"] = None
                t["att2_id"] = None
                t["att2_type"] = None
                t["att2_src"] = None
                changed += 1

        DATA_JSON.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")

    return jsonify({
        "ok": True,
        "mode": mode,
        "removed_files": removed_files,
        "records_cleared": changed
    })

@APP.post("/api/fix_title")
def fix_title():
    target = request.args.get("target", "private")
    DATA_JSON, TASKS_DIR, ATT_DIR, IMG_DIR, target = get_paths(target)

    payload = request.get_json(silent=True) or {}
    task_id = payload.get("id")
    new_title = (payload.get("title") or "").strip()

    if not task_id or not new_title:
        return jsonify({"ok": False, "error": "missing"}), 400

    html_path = TASKS_DIR / f"{task_id}.html"
    if not html_path.exists():
        return jsonify({"ok": False, "error": "html not found"}), 404

    text = html_path.read_text(encoding="utf-8")

    # 1) <title>...</title>
    text = re.sub(r"<title>.*?</title>", f"<title>{new_title}</title>", text, flags=re.DOTALL)

    # 2) pierwszy <h1>...</h1>
    text = re.sub(r"<h1>.*?</h1>", f"<h1>{new_title}</h1>", text, count=1, flags=re.DOTALL)

    html_path.write_text(text, encoding="utf-8")

    return jsonify({"ok": True})

@APP.post("/api/rename_attachment")
def rename_attachment():
    target = request.args.get("target", "private")
    DATA_JSON, TASKS_DIR, ATT_DIR, IMG_DIR, target = get_paths(target)
    R = rel_paths(target)

    payload = request.get_json(silent=True) or {}
    old_id = (payload.get("old_id") or "").strip()
    new_id = (payload.get("new_id") or "").strip()

    if not old_id or not new_id:
        return jsonify({"ok": False, "error": "missing ids"}), 400

    # 1) znajdź wrapper
    old_wrapper = ATT_DIR / f"{old_id}.html"
    new_wrapper = ATT_DIR / f"{new_id}.html"
    if not old_wrapper.exists():
        return jsonify({"ok": False, "error": "old wrapper not found"}), 404

    # 2) znajdź obrazek (dowolne rozszerzenie)
    exts = [".png", ".jpg", ".jpeg", ".webp"]
    old_img = None
    for ext in exts:
        cand = IMG_DIR / f"{old_id}{ext}"
        if cand.exists():
            old_img = cand
            break

    # 3) przenieś obrazek jeśli istnieje
    if old_img:
        new_img = IMG_DIR / f"{new_id}{old_img.suffix.lower()}"
        old_img.rename(new_img)

        # 4) popraw wrapper: src i ewentualnie tytuł
        w = old_wrapper.read_text(encoding="utf-8")
        w = w.replace(
            f"{R['img']}/{old_id}{old_img.suffix.lower()}",
            f"{R['img']}/{new_id}{old_img.suffix.lower()}"
        )
        w = re.sub(r"<title>.*?</title>", "<title>Załącznik</title>", w, flags=re.DOTALL)
        new_wrapper.write_text(w, encoding="utf-8")
        old_wrapper.unlink(missing_ok=True)
    else:
        # bez obrazka: tylko rename wrappera
        old_wrapper.rename(new_wrapper)

    # 5) popraw JSON: wszystkie rekordy, gdzie att1_id/att2_id == old_id
    tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    changed = 0
    for t in tasks:
        for which in ("att1", "att2"):
            if t.get(f"{which}_id") == old_id:
                t[f"{which}_id"] = new_id
                # src zawsze w tej samej strukturze
                t[f"{which}_src"] = f"{R['att']}/{new_id}.html"
                changed += 1

    DATA_JSON.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")

    return jsonify({"ok": True, "updated_records": changed})


@APP.post("/api/update_task")
def update_task():
    target = request.args.get("target", "private")
    DATA_JSON, TASKS_DIR, ATT_DIR, IMG_DIR, target = get_paths(target)
    R = rel_paths(target)
    try:
        meta_json = request.form.get("meta", "{}")
        body_html = request.form.get("body_html", "")
        solution_html = request.form.get("solution_html", "")

        meta = json.loads(meta_json)
        task_id = (meta.get("id") or "").strip()   # <<< ID MUSI PRZYJŚĆ Z FRONTU

        if not task_id:
            return jsonify({"ok": False, "error": "missing id"}), 400

        # 1) nadpisz plik zadania HTML
        full_title = meta.get("auto_title") or f"Zadanie {task_id}"
        html_text = make_task_html(full_title, body_html, solution_html)
        task_path = TASKS_DIR / f"{task_id}.html"
        if not task_path.exists():
            return jsonify({"ok": False, "error": "task html not found"}), 404
        task_path.write_text(html_text, encoding="utf-8")

        # 2) załączniki: nadpisz tylko jeśli jest nowy upload
        def handle_att_update(which: str, old_att_id: str | None, old_src: str | None):
            f = request.files.get(f"{which}_file")
            att_type = request.form.get(f"{which}_type") or None
            desc = request.form.get(f"{which}_desc") or ""
            intro = request.form.get(f"{which}_intro", "") or ""

            # jeśli nie ma nowego pliku → zostaw stare
            if (not f) or (f.filename == ""):
                return (old_att_id, att_type or None, old_src)

            # wylicz att_id jak przy save_task (wiązka!)
            bundle_id = bundle_base_id(meta)
            att_id = f"{bundle_id}_000" if which == "att1" else f"{bundle_id}_001"
            wrapper_path = ATT_DIR / f"{att_id}.html"
            src = f"{R['att']}/{att_id}.html"


            ext = Path(f.filename).suffix.lower()

            if ext == ".html":
                # nadpisz wrapper
                f.save(wrapper_path)
                return (att_id, att_type or "img", src)

            if ext in (".png", ".jpg", ".jpeg", ".webp"):
                # nadpisz obrazek (usuń stare wersje różnych rozszerzeń)
                for e in (".png", ".jpg", ".jpeg", ".webp"):
                    p = IMG_DIR / f"{att_id}{e}"
                    if p.exists():
                        p.unlink(missing_ok=True)

                img_name = f"{att_id}{ext}"
                img_path = IMG_DIR / img_name
                f.save(img_path)

                wrapper_html = make_attachment_wrapper(
                    f"{R['img']}/{img_name}",
                    desc,
                    intro_html=intro
                )
                wrapper_path.write_text(wrapper_html, encoding="utf-8")

                return (att_id, att_type or "img", src)

            return (old_att_id, att_type or None, old_src)

        # 3) podmień rekord w JSON (find → replace)
        tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))
        idx = next((i for i,t in enumerate(tasks) if str(t.get("id")) == task_id), None)
        if idx is None:
            return jsonify({"ok": False, "error": "record not found"}), 404

        old = tasks[idx]

        # zachowaj stare att jeśli nie ma nowego uploadu
        att1_id, att1_type, att1_src = handle_att_update("att1", old.get("att1_id"), old.get("att1_src"))
        att2_id, att2_type, att2_src = handle_att_update("att2", old.get("att2_id"), old.get("att2_src"))

        # zbuduj nowy rekord (nadpisujemy wszystko, ale id i html zostają spójne)
        new_record = dict(old)  # start od starego, żeby nie zgubić nieznanych pól
        new_record.update({
            "dzial_1": meta.get("dzial_1"),
            "dzial_2": meta.get("dzial_2"),
            "zrodlo": meta.get("zrodlo_text") or old.get("zrodlo"),
            "formula": meta.get("formula") or None,
            "poziom": meta.get("poziom") or None,
            "l_pkt": int(meta.get("l_pkt") or 0),
            "rok": int(meta["rok"]) if meta.get("rok") else None,
            "miesiac": meta.get("miesiac") or None,
            "zagadnienie": meta.get("zagadnienie") or None,
            "typ": meta.get("typ") or None,
            "kompetencja_1": meta.get("kompetencja_1"),
            "kompetencja_2": meta.get("kompetencja_2"),
            "praca_z_topo": meta.get("praca_z_topo"),
            "praca_z_mapa": meta.get("praca_z_mapa"),
            "praca_z_tekstem_zrodlowym": meta.get("praca_z_tekstem_zrodlowym"),
            "praca_z_wykresem": meta.get("praca_z_wykresem"),
            "czas_min": int(meta.get("czas_min") or 0),
            "czas_max": int(meta.get("czas_max") or 0),
            "strona": int(meta["strona"]) if meta.get("strona") else None,
            "nr_zad": meta.get("nr_zad"),
            "html": f"{R['tasks']}/{task_id}.html",
            "if_att": "T" if (att1_id or att2_id) else "N",
            "att1_id": att1_id,
            "att1_type": att1_type,
            "att1_src": att1_src,
            "att2_id": att2_id,
            "att2_type": att2_type,
            "att2_src": att2_src,
            "uwagi": meta.get("uwagi"),
            "podstawa_programowa_1": meta.get("pp1"),
            "podstawa_programowa_2": meta.get("pp2"),
            "podstawa_programowa_3": meta.get("pp3"),
            "podstawa_programowa_4": meta.get("pp4"),
            "podstawa_programowa_5": meta.get("pp5"),
            "podstawa_programowa_6": meta.get("pp6"),
        })

        tasks[idx] = new_record
        DATA_JSON.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")

        return jsonify({"ok": True, "id": task_id})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500


@APP.post("/api/export_tasks")
def export_tasks():
    target = request.args.get("target", "private")
    DATA_JSON, TASKS_DIR, ATT_DIR, IMG_DIR, target = get_paths(target)

    payload = request.get_json(silent=True) or {}
    ids = payload.get("ids") or []
    ids = [str(x) for x in ids if str(x).strip()]

    if not ids:
        return jsonify({"ok": False, "error": "no ids"}), 400

    tasks = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    by_id = {str(t.get("id")): t for t in tasks}

    selected = []
    for tid in ids:
        if tid in by_id:
            selected.append(by_id[tid])

    if not selected:
        return jsonify({"ok": False, "error": "none found"}), 404

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("meta/tasks.json", json.dumps(selected, ensure_ascii=False, indent=2))

        used_att = set()

        for t in selected:
            tid = str(t.get("id"))
            html_path = TASKS_DIR / f"{tid}.html"
            if html_path.exists():
                z.write(html_path, arcname=f"tasks/{tid}.html")

            for which in ("att1", "att2"):
                att_id = t.get(f"{which}_id")
                if not att_id or att_id in used_att:
                    continue
                used_att.add(att_id)

                wrapper = ATT_DIR / f"{att_id}.html"
                if wrapper.exists():
                    z.write(wrapper, arcname=f"attachment/{att_id}.html")

                for ext in (".png", ".jpg", ".jpeg", ".webp"):
                    img = IMG_DIR / f"{att_id}{ext}"
                    if img.exists():
                        z.write(img, arcname=f"img/{att_id}{ext}")
                        break

    memory_file.seek(0)
    return send_file(
        memory_file,
        as_attachment=True,
        download_name=f"geofinder_export_{len(selected)}.zip",
        mimetype="application/zip",
    )




@APP.get("/api/tasks_list")
def tasks_list():
    src = request.args.get("src", "private")
    path = (ROOT / "data" / ("tasks.json" if src == "public" else "tasks_private.json"))

    if not path.exists():
        return jsonify([])

    tasks = json.loads(path.read_text(encoding="utf-8"))
    out = []
    for t in tasks:
        out.append({
            "id": t.get("id"),
            "zrodlo": t.get("zrodlo"),
            "rok": t.get("rok"),
            "miesiac": t.get("miesiac"),
            "nr_zad": t.get("nr_zad"),
            "html": t.get("html"),
        })
    return jsonify(out)

@APP.get("/api/task/<task_id>")
def get_task(task_id):
    src = request.args.get("src", "private")
    path = (ROOT / "data" / ("tasks.json" if src == "public" else "tasks_private.json"))

    if not path.exists():
        return jsonify({"ok": False, "error": "no db"}), 404

    tasks = json.loads(path.read_text(encoding="utf-8"))
    rec = next((t for t in tasks if str(t.get("id")) == task_id), None)
    if not rec:
        return jsonify({"ok": False, "error": "not found"}), 404

    # opcjonalnie: wczytaj pełny HTML (na przyszłość)
    html_text = ""
    html_rel = rec.get("html") or ""
    if html_rel.startswith("../"):
        html_rel = html_rel[3:]

    # kompatybilność ze starymi folderami:
    if src == "private":
        html_rel = html_rel.replace("tasks/", "tasks_private/")
        html_rel = html_rel.replace("attachment/", "attachment_private/")
        html_rel = html_rel.replace("img/", "img_private/")
    else:
        html_rel = html_rel.replace("tasks/", "tasks_public/")
        html_rel = html_rel.replace("attachment/", "attachment_public/")
        html_rel = html_rel.replace("img/", "img_public/")

    html_path = ROOT / html_rel

    if html_path.exists():
        html_text = html_path.read_text(encoding="utf-8")

    return jsonify({"ok": True, "record": rec, "html": html_text})


# serwuj pliki statyczne projektu
@APP.route("/")
def home():
    return send_from_directory(ROOT, "index.html")

@APP.route("/<path:path>")
def static_files(path):
    return send_from_directory(ROOT, path)


if __name__ == "__main__":
    # host="0.0.0.0" jest kluczowy, żeby inni mogli się łączyć
    APP.run(host="0.0.0.0", port=5000, debug=True) 