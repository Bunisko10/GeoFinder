"""Eksporter w tym samym formacie co import serwera."""
from pathlib import Path
from urllib.parse import quote

def stworz_paczke_zadania(task_id):
    import server
    with server.APP.test_client() as client:
        response = client.get("/api/export_task/" + quote(str(task_id), safe=""))
    if response.status_code != 200:
        raise ValueError("Nie można wyeksportować zadania: " + str(response.get_json()))
    # Nazwa pliku pochodzi z bezpiecznego basename identyfikatora.
    name = Path(str(task_id)).name
    path = server.ROOT / ("EKSPORT_" + name + ".geofinder.zip")
    path.write_bytes(response.data)
    print("Gotowe:", path)
    return path
