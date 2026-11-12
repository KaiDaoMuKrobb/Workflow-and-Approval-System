"""Public deployment smoke checks for ExpenseFlow. Credentials are never printed.

Usage:
    python3 deploy/smoke_test.py SERVICE_URL

Checks:
  1. GET /api/health  -> {"status": "ok"}
  2. GET /api/ready   -> {"db": "connected"}
  3. GET /            -> HTML containing ExpenseFlow
  4. GET /login       -> HTML containing Sign in to ExpenseFlow
  5. OPTIONAL authenticated check (only if BOTH SMOKE_EMAIL and SMOKE_PASSWORD
     are set): cookie-based POST /api/auth/login -> GET /api/auth/me ->
     GET /api/reviewers (non-empty list) -> finally POST /api/auth/logout.
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request


def make_opener():
    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
    )


def request(base, path, data=None, opener=None):
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(
        base + path,
        headers=headers,
        data=json.dumps(data).encode() if data is not None else None,
    )
    open_fn = opener.open if opener is not None else urllib.request.urlopen
    with open_fn(req, timeout=30) as response:
        return response.read()


def check(base):
    for path, predicate in (
        ('/api/health', lambda b: json.loads(b).get('status') == 'ok'),
        ('/api/ready', lambda b: json.loads(b).get('db') == 'connected'),
        ('/', lambda b: b'<html' in b.lower() and b'ExpenseFlow' in b),
        ('/login', lambda b: b'<html' in b.lower() and b'Sign in to ExpenseFlow' in b),
    ):
        for attempt in range(5):
            try:
                if not predicate(request(base, path)):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return

    opener = make_opener()
    logged_in = False
    try:
        login_res = json.loads(
            request(base, '/api/auth/login', {'email': email, 'password': password}, opener=opener)
        )
        if not login_res.get('success'):
            raise ValueError('Login response was not successful')
        logged_in = True

        me_res = json.loads(request(base, '/api/auth/me', opener=opener))
        if not me_res.get('success') or me_res.get('data', {}).get('user', {}).get('email') != email.lower().strip():
            raise ValueError('Unexpected /api/auth/me payload')

        rev_res = json.loads(request(base, '/api/reviewers', opener=opener))
        reviewers = rev_res.get('data', {}).get('reviewers', [])
        if not rev_res.get('success') or not isinstance(reviewers, list) or len(reviewers) == 0:
            raise ValueError('Unexpected /api/reviewers payload')

        print('PASS login, /api/auth/me, and /api/reviewers')
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, json.JSONDecodeError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        if logged_in:
            request(base, '/api/auth/logout', data={}, opener=opener)
            print('PASS logout')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))

