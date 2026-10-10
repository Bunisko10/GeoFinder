"""Importer korzystający z tej samej obsługi paczek co serwer."""
from pathlib import Path
import io

def importuj_zadanie(sciezka_do_paczki, folder_projektu):
    import server
    root = Path(folder_projektu).resolve()
    if root != server.ROOT.resolve():
        raise ValueError("Uruchom z GEOFINDER_ROOT wskazującym folder projektu.")
    path = Path(sciezka_do_paczki)
    with server.APP.test_client() as client:
        response = client.post("/api/import_package", data={"package": (io.BytesIO(path.read_bytes()), path.name)}, content_type="multipart/form-data")
    result = response.get_json()
    if response.status_code != 200 or not result.get("ok"):
        raise ValueError(result.get("error", "Błąd importu"))
    print("Zaimportowano paczkę.")
    return result
