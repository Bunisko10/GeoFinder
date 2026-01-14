# # import os
# import sys
# import webbrowser
# from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

# # katalog exe
# BASE_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
# os.chdir(BASE_DIR)

# PORT = 8000

# server = ThreadingHTTPServer(
#     ("127.0.0.1", PORT),
#     SimpleHTTPRequestHandler
# )

# # otwarcie przeglądarki
# webbrowser.open(f"http://localhost:{PORT}/index.html")

# # SERWER MUSI ŻYĆ
# try:
#     server.serve_forever()
# except KeyboardInterrupt:
#     pass
# finally:
#     server.server_close()

import os
import sys
import threading
import webbrowser
import traceback

BASE_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
os.chdir(BASE_DIR)

os.environ["GEOFINDER_ROOT"] = BASE_DIR  # jeśli robisz fix pod --onefile


from server import APP

HOST = "127.0.0.1"
PORT = 8000

def open_browser():
    webbrowser.open(f"http://{HOST}:{PORT}/")

if __name__ == "__main__":
    threading.Timer(0.6, open_browser).start()

    try:
        APP.run(host=HOST, port=PORT, debug=False, threaded=True)
    except Exception:
        print("\n❌ SERVER CRASH")
        traceback.print_exc()
    finally:
        input("\n(Enter) żeby zamknąć okno… ")

