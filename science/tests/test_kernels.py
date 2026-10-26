import hashlib
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from kernel_common import validate_entry, verify_file, load_manifest
from fetch_kernels import OfficialRedirects


class KernelIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.payload = b'test-only kernel bytes; not science data'
        self.entry = dict(filename='fixture.tls', sourceUrl='https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/fixture.tls', expectedBytes=len(self.payload), sha256=hashlib.sha256(self.payload).hexdigest(), verificationStatus='PINNED')

    def test_valid_pin(self):
        self.assertEqual(validate_entry(self.entry), self.entry)

    def test_manifest_is_fully_pinned_and_unique(self):
        manifest = load_manifest()
        self.assertEqual(len(manifest['kernels']), 6)
        self.assertEqual(len({e['filename'] for e in manifest['kernels']}), 6)

    def test_requires_checksum_and_size(self):
        for patch in [dict(sha256=None), dict(sha256='0'), dict(expectedBytes=None), dict(expectedBytes=True), dict(verificationStatus='UNRESOLVED')]:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                validate_entry({**self.entry, **patch})

    def test_rejects_untrusted_urls_and_paths(self):
        for url in ['http://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/fixture.tls', 'https://evil.test/fixture.tls', 'https://naif.jpl.nasa.gov.evil.test/pub/naif/generic_kernels/lsk/fixture.tls', 'https://user@naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/fixture.tls', 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/../fixture.tls']:
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_entry({**self.entry, 'sourceUrl': url})
        with self.assertRaises(ValueError):
            validate_entry({**self.entry, 'filename': '../fixture.tls'})

    def test_tampering_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.tls'
            path.write_bytes(self.payload)
            verify_file(path, self.entry)
            path.write_bytes(b'x' * len(self.payload))
            with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
                verify_file(path, self.entry)
            path.write_bytes(b'bad')
            with self.assertRaisesRegex(ValueError, 'size mismatch'):
                verify_file(path, self.entry)

    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            original = Path(directory) / 'original'
            original.write_bytes(self.payload)
            link = Path(directory) / 'fixture.tls'
            link.symlink_to(original)
            with self.assertRaises(ValueError):
                verify_file(link, self.entry)

    def test_cross_host_redirect_rejected(self):
        with self.assertRaisesRegex(ValueError, 'left approved'):
            OfficialRedirects().redirect_request(None, None, 302, '', {}, 'https://evil.test/kernel')
