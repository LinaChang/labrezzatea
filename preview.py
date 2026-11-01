"""Serve only the downloaded offline directory on loopback."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8080)
parser.add_argument('--open', action='store_true')
args = parser.parse_args()
directory = Path(__file__).resolve().parent / 'offline'
handler = functools.partial(SimpleHTTPRequestHandler, directory=str(directory))
try:
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
except OSError:
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
url = f'http://127.0.0.1:{server.server_port}/'
print(f'Offline preview: {url}\nSitemap: {url}sitemap.html\nPress Ctrl+C to stop.', flush=True)
if args.open:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
