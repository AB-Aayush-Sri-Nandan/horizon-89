#!/usr/bin/env python3
from kernel_common import DATA, load_manifest, verify_file


def main():
    manifest = load_manifest()
    for entry in manifest['kernels']:
        verify_file(DATA / entry['filename'], entry)
        print(f'Verified {entry["filename"]}')
    print(f'Integrity verified: {manifest["kernelSetId"]}. SPICE coverage/transform validation still required.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit(f'Kernel verification BLOCKED: {error}')
