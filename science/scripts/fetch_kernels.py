#!/usr/bin/env python3
"""Fetch only a fully pinned manifest; TLS, size and digest checks stay enabled."""
import os
import tempfile
from pathlib import Path
from urllib.request import HTTPRedirectHandler, build_opener
from urllib.parse import urlsplit
from kernel_common import DATA, load_manifest, verify_file


class OfficialRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        url = urlsplit(newurl)
        if (url.scheme != 'https' or url.hostname != 'naif.jpl.nasa.gov' or
                url.port or url.username or url.password or
                not url.path.startswith('/pub/naif/generic_kernels/')):
            raise ValueError('Kernel redirect left approved official source.')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def main():
    manifest = load_manifest()  # Validate ALL entries before any network access.
    DATA.mkdir(parents=True, exist_ok=True)
    if DATA.is_symlink():
        raise ValueError('Kernel data directory must not be a symlink.')
    opener = build_opener(OfficialRedirects())
    for entry in manifest['kernels']:
        destination = DATA / entry['filename']
        if destination.exists():
            verify_file(destination, entry)  # Preserve existing corrupt files for investigation.
            print(f'Verified existing {entry["filename"]}')
            continue
        fd, temporary = tempfile.mkstemp(prefix='.kernel-', dir=DATA)
        try:
            count = 0
            with os.fdopen(fd, 'wb') as output, opener.open(entry['sourceUrl'], timeout=60) as response:
                while chunk := response.read(1024 * 1024):
                    count += len(chunk)
                    if count > entry['expectedBytes']:
                        raise ValueError(f'{entry["filename"]}: download exceeds pinned size.')
                    output.write(chunk)
            verify_file(Path(temporary), entry)
            os.replace(temporary, destination)
            print(f'Downloaded and verified {entry["filename"]}')
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit(f'Kernel bootstrap BLOCKED: {error}')
