from __future__ import annotations

import socket
import threading
import webbrowser
from pathlib import Path

from werkzeug.serving import make_server

from server import app


APP_TITLE = "EEG Local Analyzer"


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class ServerThread(threading.Thread):
    def __init__(self, port: int) -> None:
        super().__init__(daemon=True)
        self.port = port
        self.server = make_server("127.0.0.1", port, app)

    def run(self) -> None:
        self.server.serve_forever()

    def stop(self) -> None:
        self.server.shutdown()


def main() -> None:
    port = find_free_port()
    server = ServerThread(port)
    server.start()
    url = f"http://127.0.0.1:{port}/"

    try:
        import webview

        window = webview.create_window(
            APP_TITLE,
            url,
            width=1440,
            height=900,
            min_size=(1100, 720),
            text_select=True,
        )
        webview.start()
        _ = window
    except Exception:
        webbrowser.open(url)
        input(f"{APP_TITLE} esta ejecutandose en {url}. Presiona Enter para cerrar.")
    finally:
        server.stop()


if __name__ == "__main__":
    main()
