#!/usr/bin/env python3
"""
PRIME-CAE · bundler

The site is authored as ES modules. Browsers refuse to load ES modules from a
file:// page, which means a double-clicked index.html would lose all of its
behaviour. This flattens the module graph into one classic script that runs from
disk and from a server alike.

    python3 build.py

Writes js/prime.bundle.js. The modules under js/ stay the source of truth.
"""
import os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(BASE, "js")
ENTRY = os.path.join(JS, "app.js")
OUT = os.path.join(JS, "prime.bundle.js")

IMPORT_RE = re.compile(r"^\s*import\s+(?:[^'\"]+?\s+from\s+)?['\"]([^'\"]+)['\"]\s*;?\s*$", re.M)
EXPORT_LIST_RE = re.compile(r"^\s*export\s*\{[^}]*\}\s*;?\s*$", re.M)
EXPORT_KW_RE = re.compile(r"^(\s*)export\s+(?=(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class)\b)", re.M)
TOPLEVEL_DECL_RE = re.compile(r"^(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)", re.M)


def unclosed_literal(src):
    """
    The line where a quoted string is still open at the newline, if any.

    A ' or " literal cannot span a line in JavaScript, so this is always a real
    syntax error — usually a pasted value that lost its closing quote. Catching
    it here matters because the bundle is one script: one bad token anywhere
    stops every module, and the page falls back to the launch gate with nothing
    to say about why.
    """
    i, n, line, prev = 0, len(src), 1, ''
    while i < n:
        c = src[i]
        if c == '\n':
            line += 1; i += 1; continue
        if c in ' \t\r':
            i += 1; continue
        if c == '/' and i + 1 < n and src[i + 1] == '/':          # line comment
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':          # block comment
            j = src.find('*/', i + 2)
            if j < 0:
                return line, 'unterminated block comment'
            line += src.count('\n', i, j); i = j + 2
            continue
        if c == '/' and (prev == '' or prev in '=(,:[!&|?{};+-*%<>~^'):
            j, klass = i + 1, False                                # regex literal
            while j < n:
                d = src[j]
                if d == '\\': j += 2; continue
                if d == '[': klass = True
                elif d == ']': klass = False
                elif d == '/' and not klass: break
                elif d == '\n': break
                j += 1
            if j < n and src[j] == '/':
                i, prev = j + 1, '/'
                continue
        if c == '`':                                               # template
            j = i + 1
            while j < n:
                if src[j] == '\\': j += 2; continue
                if src[j] == '`': break
                j += 1
            if j >= n:
                return line, 'unterminated template literal'
            line += src.count('\n', i, j); i, prev = j + 1, '`'
            continue
        if c in '\'"':                                             # string
            j = i + 1
            while j < n and src[j] not in (c, '\n'):
                if src[j] == '\\': j += 2; continue
                j += 1
            if j >= n or src[j] == '\n':
                return line, 'unterminated %s string' % c
            i, prev = j + 1, c
            continue
        prev = c
        i += 1
    return None


def deps(path, src):
    out = []
    for m in IMPORT_RE.finditer(src):
        spec = m.group(1)
        if not spec.startswith("."):
            sys.exit(f"bare import {spec!r} in {path} — vendor it locally instead")
        out.append(os.path.normpath(os.path.join(os.path.dirname(path), spec)))
    return out


order, seen, stack = [], set(), set()


def visit(path):
    if path in seen:
        return
    if path in stack:
        sys.exit(f"import cycle at {os.path.relpath(path, BASE)}")
    stack.add(path)
    src = open(path).read()
    bad = unclosed_literal(src)
    if bad:
        sys.exit(f"{os.path.relpath(path, BASE)}:{bad[0]}: {bad[1]} — "
                 f"the bundle was not written, so the previous one still works")
    for d in deps(path, src):
        if not os.path.exists(d):
            sys.exit(f"missing import target {os.path.relpath(d, BASE)} (from {os.path.relpath(path, BASE)})")
        visit(d)
    stack.discard(path)
    seen.add(path)
    order.append(path)


visit(ENTRY)

# one shared scope means duplicate top-level names would silently clobber
names, chunks = {}, []
for path in order:
    src = open(path).read()
    body = EXPORT_LIST_RE.sub("", IMPORT_RE.sub("", src))
    body = EXPORT_KW_RE.sub(r"\1", body)
    rel = os.path.relpath(path, BASE)
    for m in TOPLEVEL_DECL_RE.finditer(body):
        n = m.group(1)
        if n in names:
            sys.exit(f"duplicate top-level name {n!r} in {rel} and {names[n]} — rename one")
        names[n] = rel
    chunks.append(f"/* ==== {rel} " + "=" * max(0, 62 - len(rel)) + " */\n" + body.strip() + "\n")

banner = (
    "/* PRIME-CAE — generated by build.py. Do not edit.\n"
    "   Source of truth: the ES modules under js/. Rebuild with `python3 build.py`.\n"
    f"   Modules bundled: {len(order)} */\n"
)
open(OUT, "w").write(banner + "(function () {\n'use strict';\n\n" + "\n".join(chunks) + "\n})();\n")
print(f"bundled {len(order)} modules -> {os.path.relpath(OUT, BASE)} "
      f"({os.path.getsize(OUT)/1024:.0f} KB, {len(names)} top-level names)")
