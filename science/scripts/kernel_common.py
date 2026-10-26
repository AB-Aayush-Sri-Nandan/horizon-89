"""Strict, standard-library-only kernel manifest handling. No SPICE engine yet."""
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'kernels' / 'manifest.json'
DATA = ROOT / 'kernels' / 'data'


def validate_entry(entry):
    name = entry.get('filename')
    if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9_][A-Za-z0-9_.-]*', name):
        raise ValueError('Kernel needs a resolved, safe filename.')
    url = urlsplit(entry.get('sourceUrl') or '')
    if (url.scheme != 'https' or url.hostname != 'naif.jpl.nasa.gov' or
            url.username or url.password or url.port or url.query or url.fragment or
            not url.path.startswith('/pub/naif/generic_kernels/') or
            url.path.rsplit('/', 1)[-1] != name or '..' in url.path.split('/')):
        raise ValueError(f'{name}: only an exact official NAIF HTTPS URL is allowed.')
    if not isinstance(entry.get('expectedBytes'), int) or isinstance(entry['expectedBytes'], bool) or entry['expectedBytes'] <= 0:
        raise ValueError(f'{name}: expectedBytes must be pinned from official-source evidence.')
    if not isinstance(entry.get('sha256'), str) or not re.fullmatch(r'[a-f0-9]{64}', entry['sha256']):
        raise ValueError(f'{name}: SHA-256 must be pinned before use.')
    if entry.get('verificationStatus') != 'PINNED':
        raise ValueError(f'{name}: kernel is not pinned.')
    return entry


def load_manifest():
    manifest = json.loads(MANIFEST.read_text())
    kernels = manifest['kernels']
    if not kernels:
        raise ValueError('Empty kernel manifest.')
    for entry in kernels:
        validate_entry(entry)
    names = [entry['filename'] for entry in kernels]
    if len(names) != len(set(names)):
        raise ValueError('Duplicate kernel filename.')
    return manifest


def verify_file(path, entry):
    if path.is_symlink() or not path.is_file():
        raise ValueError(f'{entry["filename"]}: missing file or unsupported symlink.')
    if path.stat().st_size != entry['expectedBytes']:
        raise ValueError(f'{entry["filename"]}: size mismatch.')
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    if digest.hexdigest() != entry['sha256']:
        raise ValueError(f'{entry["filename"]}: checksum mismatch.')
