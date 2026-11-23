#!/usr/bin/env python3
"""Regression checks for credentials written by the iOS pairing flow."""

from pathlib import Path
import unittest


SOURCE = (
    Path(__file__).resolve().parents[1] / "clients" / "ios" / "GBConnection.m"
).read_text(encoding="utf-8")


class PairingCredentialsTests(unittest.TestCase):
    def test_pairing_syncs_app_intent_credentials_after_saving_token(self):
        marker = "GBConnection.shared.deviceToken = token;"
        source = SOURCE[SOURCE.index(marker) :]
        sync = source.index("GBSyncAppIntentCredentials();")
        dismiss = source.index("dismissViewControllerAnimated:YES", sync)
        self.assertLess(sync, dismiss)

    def test_both_restore_and_connection_edit_keep_the_sync(self):
        self.assertGreaterEqual(SOURCE.count("GBSyncAppIntentCredentials();"), 4)


if __name__ == "__main__":
    unittest.main()
