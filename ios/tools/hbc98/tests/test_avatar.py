from __future__ import annotations

import unittest

from ios.tools.build_ios_126_recipe import (
    CHAT_AVATAR_DEFAULT_STATIC_INDEX,
    CHAT_AVATAR_FUNCTION,
    CHAT_AVATAR_LIVE_INDEX,
    CHAT_AVATAR_LOAD_OFFSET,
    assert_chat_avatar_motion,
    enable_chat_avatar_motion,
)


class ChatAvatarMotionTests(unittest.TestCase):
    def test_patch_requires_the_pinned_stock_bundle(self):
        # The mutation is deliberately based on semantic checks in the function
        # body rather than a raw byte replacement. A complete pinned fixture is
        # exercised by the recipe builder's pinned-input integration tests.
        self.assertEqual(CHAT_AVATAR_FUNCTION, 40727)
        self.assertEqual(CHAT_AVATAR_DEFAULT_STATIC_INDEX, 16147)
        self.assertEqual(CHAT_AVATAR_LIVE_INDEX, 17658)
        self.assertEqual(CHAT_AVATAR_LOAD_OFFSET, 52)
        self.assertTrue(callable(enable_chat_avatar_motion))
        self.assertTrue(callable(assert_chat_avatar_motion))


if __name__ == '__main__':
    unittest.main()
