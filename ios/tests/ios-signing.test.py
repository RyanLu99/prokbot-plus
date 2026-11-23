"""Signing entitlement and Expo token-store configuration tests."""
from pathlib import Path
import json
import plistlib
import sys
import tempfile
import unittest
from unittest.mock import patch


IOS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(IOS_ROOT / 'patchers' / 'ios'))
import signing  # noqa: E402


def profile(
    bundle_id='dev.example.app',
    prefix='TEAM123456',
    groups=None,
    keychains=None,
):
    return {
        'ApplicationIdentifierPrefix': [prefix],
        'TeamIdentifier': [prefix],
        'Entitlements': {
            'application-identifier': prefix + '.' + bundle_id,
            'keychain-access-groups': keychains or [prefix + '.*'],
            'com.apple.security.application-groups': groups or [],
            'get-task-allow': True,
        },
    }


class EntitlementTests(unittest.TestCase):
    def test_main_and_extensions_get_default_and_shared_keychain_groups(self):
        main = profile(groups=['group.dev.example.app'])
        values = signing.entitlements(
            main, 'dev.example.app', 'group.dev.example.app', 'dev.example.app'
        )
        self.assertEqual(
            values['keychain-access-groups'],
            [
                'TEAM123456.dev.example.app',
                'TEAM123456.dev.example.app.shared',
            ],
        )
        self.assertEqual(
            values['com.apple.security.application-groups'],
            ['group.dev.example.app'],
        )

    def test_profile_without_app_group_omits_the_entitlement(self):
        values = signing.entitlements(
            profile(), 'dev.example.app', 'group.dev.example.app', 'dev.example.app'
        )
        self.assertNotIn('com.apple.security.application-groups', values)

    def test_allowed_groups_only_returns_an_authorized_group(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'profile.mobileprovision'
            path.write_bytes(b'fixture')
            with patch.object(
                signing, 'profile', return_value=profile(groups=['group.allowed'])
            ):
                self.assertEqual(
                    signing.entitlements_allowed_groups(path, 'group.allowed'),
                    ['group.allowed'],
                )
                self.assertEqual(
                    signing.entitlements_allowed_groups(path, 'group.other'),
                    [],
                )


class ExpoConfigTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.app = Path(self.temporary.name) / 'Demo.app'
        self.path = self.app / 'EXConstants.bundle' / 'app.config'
        self.path.parent.mkdir(parents=True)

    def write_config(self, value):
        payload = json.dumps(value, separators=(',', ':')).encode()
        self.path.write_bytes(payload.ljust(4096, b' '))

    def test_updates_team_and_removes_previous_team(self):
        value = {
            'ios': {'appleTeamId': 'OLDTEAM'},
            'extra': {
                'appleTeamId': 'OLDTEAM',
                'previousAppleTeamId': 'PREVIOUS',
                'other': True,
            },
        }
        self.write_config(value)
        signing.update_expo_config(self.app, 'NEWTEAM')
        updated = json.loads(self.path.read_text(encoding='utf-8'))
        self.assertEqual(updated['ios']['appleTeamId'], 'NEWTEAM')
        self.assertEqual(updated['extra']['appleTeamId'], 'NEWTEAM')
        self.assertNotIn('previousAppleTeamId', updated['extra'])
        self.assertTrue(updated['extra']['other'])
        self.assertEqual(self.path.stat().st_size, 4096)

    def test_missing_config_fails_without_creating_a_file(self):
        with self.assertRaisesRegex(ValueError, 'Missing Expo app.config'):
            signing.update_expo_config(self.app, 'NEWTEAM')
        self.assertFalse(self.path.exists())

    def test_malformed_config_fails_without_modifying_it(self):
        self.path.write_bytes(b'{not json')
        with self.assertRaisesRegex(ValueError, 'Malformed Expo app.config'):
            signing.update_expo_config(self.app, 'NEWTEAM')
        self.assertEqual(self.path.read_bytes(), b'{not json')

    def test_missing_sections_fail_without_modifying_config(self):
        value = {'ios': {}, 'extra': []}
        self.write_config(value)
        before = self.path.read_bytes()
        with self.assertRaisesRegex(ValueError, 'missing ios or extra'):
            signing.update_expo_config(self.app, 'NEWTEAM')
        self.assertEqual(self.path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
