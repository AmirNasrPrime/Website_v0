#!/bin/bash
# =============================================================================
#  PRIME-CAE — local launcher
#  Double-click this file. It starts a local server in this folder and opens
#  the site. Nothing is installed and nothing leaves the machine.
# =============================================================================
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE" || { echo "Could not enter $HERE"; exit 1; }

printf '\n\033[1m  PRIME-CAE\033[0m  ·  AI-Native Computer-Aided Engineering\n'
printf '  %s\n\n' "$HERE"

# --- locate a Python 3 ------------------------------------------------------
PY=""
for candidate in python3 /usr/bin/python3 /usr/local/bin/python3 /opt/homebrew/bin/python3 python; do
  if command -v "$candidate" >/dev/null 2>&1; then
    if "$candidate" -c 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)' >/dev/null 2>&1; then
      PY="$candidate"; break
    fi
  fi
done

if [ -z "$PY" ]; then
  printf '\033[31m  Python 3 was not found on this Mac.\033[0m\n\n'
  printf '  PRIME-CAE needs a tiny local web server to run. Two ways to get one:\n\n'
  printf '    1. Open Terminal and run:  xcode-select --install\n'
  printf '       (installs Apple'"'"'s command line tools, which include Python 3)\n\n'
  printf '    2. Or install Python from  https://www.python.org/downloads/macos/\n\n'
  printf '  Then double-click this file again.\n\n'
  read -r -p "  Press return to close this window. " _
  exit 1
fi

# --- find a free port -------------------------------------------------------
PORT="$("$PY" - <<'PYEOF'
import socket
for p in list(range(8080, 8120)) + [0]:
    s = socket.socket()
    try:
        s.bind(("127.0.0.1", p))
        print(s.getsockname()[1])
        s.close()
        break
    except OSError:
        pass
    finally:
        try: s.close()
        except Exception: pass
PYEOF
)"

if [ -z "$PORT" ]; then
  printf '\033[31m  Could not open a local port.\033[0m\n\n'
  read -r -p "  Press return to close this window. " _
  exit 1
fi

URL="http://localhost:${PORT}/index.html"

printf '  Serving on \033[36m%s\033[0m\n' "$URL"
printf '  Close this window (or press Ctrl-C) to stop the server.\n\n'

# --- open the browser once the server answers -------------------------------
(
  for _ in $(seq 1 40); do
    if "$PY" -c "
import sys,urllib.request
try:
    urllib.request.urlopen('$URL', timeout=1); sys.exit(0)
except Exception:
    sys.exit(1)
" >/dev/null 2>&1; then
      open "$URL"
      exit 0
    fi
    sleep 0.25
  done
  open "$URL"
) &

# --- serve ------------------------------------------------------------------
exec "$PY" - "$PORT" <<'PYEOF'
import http.server, socketserver, sys, os, re

PORT = int(sys.argv[1])

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.mjs': 'text/javascript',
        '.js':  'text/javascript',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
    }

    def end_headers(self):
        # local development: never serve a stale module or stylesheet
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def send_head(self):
        """SimpleHTTPRequestHandler cannot answer Range requests, which some
        browsers need before they will start a large video. Serve 206 for a
        byte range and fall back to the default behaviour otherwise."""
        rng = self.headers.get('Range')
        if not rng:
            return super().send_head()
        path = self.translate_path(self.path)
        if os.path.isdir(path) or not os.path.isfile(path):
            return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)\s*$', rng)
        if not m:
            return super().send_head()
        size = os.path.getsize(path)
        first, last = m.group(1), m.group(2)
        if first == '':
            length = min(int(last or 0), size)
            start, end = size - length, size - 1
        else:
            start = int(first)
            end = int(last) if last else size - 1
        if start >= size or start > end:
            self.send_response(416)
            self.send_header('Content-Range', 'bytes */%d' % size)
            self.end_headers()
            return None
        end = min(end, size - 1)
        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', 'bytes %d-%d/%d' % (start, end, size))
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        return _Slice(f, end - start + 1)

    def log_message(self, fmt, *args):
        msg = fmt % args
        if ' 404 ' in msg or ' 500 ' in msg:
            sys.stderr.write('  missing: %s\n' % msg)


class _Slice:
    """A read-limited view of an open file, so copyfile stops at the range."""
    def __init__(self, f, length):
        self.f, self.left = f, length
    def read(self, n=-1):
        if self.left <= 0:
            return b''
        if n is None or n < 0:
            n = self.left
        data = self.f.read(min(n, self.left))
        self.left -= len(data)
        return data
    def close(self):
        self.f.close()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True
    def handle_error(self, request, client_address):
        # a browser aborting a video request is normal; do not shout about it
        exc = sys.exc_info()[0]
        if exc and issubclass(exc, (BrokenPipeError, ConnectionResetError)):
            return
        super().handle_error(request, client_address)


try:
    with Server(('127.0.0.1', PORT), Handler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print('\n  PRIME-CAE server stopped.\n')
PYEOF
