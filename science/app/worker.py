"""Private bounded stdin/stdout protocol, no HTTP listener or network access."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from engine import Engine, ScienceFailure, unavailable


def main():
    try:
        engine = Engine()
    except ScienceFailure as error:
        print(json.dumps(unavailable(error)), flush=True)
        return 1
    print(json.dumps({'ready': True}), flush=True)
    while True:
        line = sys.stdin.buffer.readline(16385)
        if not line:
            return 0
        if len(line) > 16384 or not line.endswith(b'\n'):
            return 2  # fail closed on a broken/oversized protocol frame
        request_id = None
        try:
            request = json.loads(line)
            if not isinstance(request, dict) or set(request) != {'id', 'request'} or type(request['id']) is not int:
                raise ScienceFailure('VALIDATION_ERROR', 'Invalid private request envelope.')
            request_id = request['id']
            result = engine.compute(request['request'])
        except ScienceFailure as error:
            result = unavailable(error)
        except (ValueError, TypeError):
            result = unavailable(ScienceFailure('VALIDATION_ERROR', 'Invalid science request.'))
        except Exception:
            result = unavailable(ScienceFailure('INTERNAL_ERROR', 'Science computation failed safely.'))
        print(json.dumps({'id': request_id, 'result': result}, allow_nan=False), flush=True)


if __name__ == '__main__':
    raise SystemExit(main())
