# Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
#
# A stand-in for the `brotli` Python package, used only by build-fonts.py.
# fontTools needs `brotli` to read and write WOFF2. When the package is not
# installed, this module forwards the work to Node's built-in zlib, which
# ships the same Brotli encoder. It implements the three names fontTools
# touches: compress(), decompress() and the MODE_* constants.

import subprocess

MODE_GENERIC = 0
MODE_TEXT = 1
MODE_FONT = 2

_COMPRESS = r"""
const zlib = require('zlib');
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const input = Buffer.concat(chunks);
  const [mode, quality, lgwin] = process.argv.slice(1).map(Number);
  const out = zlib.brotliCompressSync(input, {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: mode,
      [zlib.constants.BROTLI_PARAM_QUALITY]: quality,
      [zlib.constants.BROTLI_PARAM_LGWIN]: lgwin,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: input.length,
    },
  });
  process.stdout.write(out);
});
"""

_DECOMPRESS = r"""
const zlib = require('zlib');
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  process.stdout.write(zlib.brotliDecompressSync(Buffer.concat(chunks)));
});
"""


def _run(script, data, *args):
    result = subprocess.run(
        ["node", "-e", script, "--", *[str(a) for a in args]],
        input=bytes(data),
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("node brotli failed: " + result.stderr.decode("utf-8", "replace"))
    return result.stdout


def compress(data, mode=MODE_GENERIC, quality=11, lgwin=22, lgblock=0):
    return _run(_COMPRESS, data, mode, quality, lgwin)


def decompress(data):
    return _run(_DECOMPRESS, data)


class error(Exception):
    pass
