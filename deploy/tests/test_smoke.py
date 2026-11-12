"""Offline unit tests for deploy/smoke_test.py (the network is mocked)."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).parents[1] / 'smoke_test.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class SmokeTests(unittest.TestCase):
    def response(self, base, path, data=None, opener=None):
        return {
            '/api/health': b'{"status":"ok","service":"expenseflow"}',
            '/api/ready': b'{"status":"ready","db":"connected"}',
            '/': b'<html><title>ExpenseFlow</title></html>',
            '/login': b'<html><h1>Sign in to ExpenseFlow</h1></html>',
            '/api/auth/login': b'{"success":true,"data":{"user":{"email":"smoke@example.test"}}}',
            '/api/auth/me': b'{"success":true,"data":{"user":{"email":"smoke@example.test"}}}',
            '/api/reviewers': b'{"success":true,"data":{"reviewers":[{"id":"rev-1"}]}}',
            '/api/auth/logout': b'{"success":true}',
        }[path]

    @patch.dict('os.environ', {}, clear=True)
    def test_public_checks_pass_and_skip_optional_login(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            self.assertEqual(req.call_count, 4)

    @patch.dict('os.environ', {}, clear=True)
    def test_db_not_ready_fails_even_when_http_responds(self):
        def disconnected(base, path, **kwargs):
            return b'{"status":"not_ready","db":"disconnected"}' if path == '/api/ready' else self.response(base, path)

        with patch.object(smoke, 'request', side_effect=disconnected), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/ready'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_session_is_logged_out_even_if_me_fails(self):
        def broken_me(base, path, data=None, opener=None):
            if path == '/api/auth/me':
                raise ValueError('Broken response')
            return self.response(base, path, data, opener)

        with patch.object(smoke, 'request', side_effect=broken_me) as req:
            with self.assertRaisesRegex(RuntimeError, 'Login smoke'):
                smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')


if __name__ == '__main__':
    unittest.main()

