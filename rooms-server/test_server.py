import copy
import io
import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from server import Application, Store


class RoomsApiTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.directory.name) / "rooms.sqlite3")
        self.app = Application(self.store)
        self.alice = self.account("Alice")
        self.bob = self.account("Bob")
        self.eve = self.account("Eve")
        self.room = self.request("POST", "/v1/rooms", {"name": "Friends"}, self.alice)[1]["id"]
        self.payload = {
            "clientId": "installation-1-session-3", "presetName": "ジム",
            "startedAt": "2026-10-22T10:00:00Z", "endedAt": "2026-10-22T10:25:00Z",
            "exercises": [{"name": "ベンチプレス", "sets": [{"order": 1, "side": None, "weightKg": 60.0, "reps": 10}]}],
        }

    def tearDown(self):
        self.directory.cleanup()

    def request(self, method, path, data=None, account=None, raw=None):
        body = raw if raw is not None else json.dumps(data).encode() if data is not None else b""
        route, _, query = path.partition("?")
        environ = {"REQUEST_METHOD": method, "PATH_INFO": route, "QUERY_STRING": query,
                   "CONTENT_LENGTH": str(len(body)), "CONTENT_TYPE": "application/json", "wsgi.input": io.BytesIO(body), "REMOTE_ADDR": "192.0.2.1"}
        if account:
            environ["HTTP_AUTHORIZATION"] = "Bearer " + account["token"]
        statuses = []
        result = b"".join(self.app(environ, lambda status, headers: statuses.append(status)))
        return int(statuses[0].split()[0]), json.loads(result)

    def account(self, name):
        status, account = self.request("POST", "/v1/account", {"name": name})
        self.assertEqual(200, status)
        return account

    def join_bob(self):
        code = self.request("GET", "/v1/rooms", account=self.alice)[1]["rooms"][0]["inviteCode"]
        self.assertEqual(200, self.request("POST", "/v1/rooms/join", {"code": code}, self.bob)[0])

    def test_invitation_and_membership_protect_both_posts_and_members(self):
        for path in (f"/v1/rooms/{self.room}", f"/v1/rooms/{self.room}/posts"):
            self.assertEqual(404, self.request("GET", path, account=self.bob)[0])
        self.assertEqual(404, self.request("POST", f"/v1/rooms/{self.room}/posts", self.payload, self.bob)[0])
        self.join_bob()
        self.assertEqual(200, self.request("POST", f"/v1/rooms/{self.room}/posts", self.payload, self.alice)[0])
        posts = self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.bob)[1]["posts"]
        self.assertEqual(1, len(posts))
        self.assertEqual(25, posts[0]["workout"]["durationMinutes"])
        self.assertEqual("ベンチプレス", posts[0]["workout"]["exercises"][0]["name"])
        self.assertEqual(404, self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.eve)[0])

    def test_retry_is_idempotent_even_with_concurrent_requests(self):
        with ThreadPoolExecutor(max_workers=4) as pool:
            responses = list(pool.map(lambda _: self.request("POST", f"/v1/rooms/{self.room}/posts", self.payload, self.alice), range(8)))
        self.assertTrue(all(status == 200 for status, _ in responses))
        self.assertEqual(1, len({body["id"] for _, body in responses}))
        self.assertEqual(1, len(self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.alice)[1]["posts"]))

    def test_only_author_can_delete_shared_copy(self):
        self.join_bob()
        post = self.request("POST", f"/v1/rooms/{self.room}/posts", self.payload, self.alice)[1]["id"]
        self.assertEqual(404, self.request("DELETE", f"/v1/rooms/{self.room}/posts/{post}", account=self.bob)[0])
        self.assertEqual(200, self.request("DELETE", f"/v1/rooms/{self.room}/posts/{post}", account=self.alice)[0])

    def test_leaving_revokes_access_and_removes_shared_copies(self):
        self.join_bob()
        self.request("POST", f"/v1/rooms/{self.room}/posts", self.payload, self.bob)
        self.assertEqual(200, self.request("DELETE", f"/v1/rooms/{self.room}", account=self.bob)[0])
        self.assertEqual(404, self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.bob)[0])
        self.assertEqual([], self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.alice)[1]["posts"])
        self.assertEqual(200, self.request("DELETE", f"/v1/rooms/{self.room}", account=self.alice)[0])
        self.assertEqual([], self.request("GET", "/v1/rooms", account=self.alice)[1]["rooms"])

    def test_bad_snapshots_never_reach_storage(self):
        invalids = []
        for value in (-1, float("inf"), True, "60"):
            item = copy.deepcopy(self.payload)
            item["exercises"][0]["sets"][0]["weightKg"] = value
            invalids.append(item)
        item = copy.deepcopy(self.payload)
        item["endedAt"] = "2026-10-22T09:00:00Z"
        invalids.append(item)
        item = copy.deepcopy(self.payload)
        item["exercises"] = []
        invalids.append(item)
        for item in invalids:
            self.assertEqual(400, self.request("POST", f"/v1/rooms/{self.room}/posts", item, self.alice)[0])
        self.assertEqual([], self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.alice)[1]["posts"])

    def test_authentication_and_invalid_json(self):
        self.assertEqual(401, self.request("GET", "/v1/rooms")[0])
        self.assertEqual(401, self.request("GET", "/v1/rooms", account={"token": "invalid" * 8})[0])
        self.assertEqual(400, self.request("POST", "/v1/account", raw=b"not JSON")[0])
        self.assertEqual(413, self.request("POST", "/v1/account", raw=b"x" * 131073)[0])
        with self.store.connect() as db:
            saved = db.execute("SELECT token_hash FROM users WHERE id=?", (self.alice["id"],)).fetchone()[0]
        self.assertNotEqual(saved, self.alice["token"])

    def test_account_deletion_revokes_token_and_cascades_rooms(self):
        self.join_bob()
        self.assertEqual(200, self.request("DELETE", "/v1/account", account=self.alice)[0])
        self.assertEqual(401, self.request("GET", "/v1/rooms", account=self.alice)[0])
        self.assertEqual([], self.request("GET", "/v1/rooms", account=self.bob)[1]["rooms"])

    def test_bilateral_snapshot_and_pagination(self):
        for i in range(51):
            item = copy.deepcopy(self.payload)
            item["clientId"] = f"session-{i}"
            item["exercises"][0]["sets"] = [{"order": 1, "side": "左", "weightKg": 8, "reps": 10}, {"order": 1, "side": "右", "weightKg": 10, "reps": 9}]
            self.assertEqual(200, self.request("POST", f"/v1/rooms/{self.room}/posts", item, self.alice)[0])
        first = self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.alice)[1]
        second = self.request("GET", f"/v1/rooms/{self.room}/posts?before={first['nextCursor']}", account=self.alice)[1]
        self.assertEqual((50, 1), (len(first["posts"]), len(second["posts"])))
        self.assertEqual(51, len({row["id"] for row in first["posts"] + second["posts"]}))
        self.assertEqual("右", first["posts"][0]["workout"]["exercises"][0]["sets"][1]["side"])
        self.assertIsNone(second["nextCursor"])

    def test_profile_update_changes_the_display_name_on_posts(self):
        self.request("POST", f"/v1/rooms/{self.room}/posts", self.payload, self.alice)
        self.assertEqual(200, self.request("PUT", "/v1/account", {"name": "アリス"}, self.alice)[0])
        result = self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.alice)[1]
        self.assertEqual("アリス", result["posts"][0]["name"])

    def test_daily_post_limit_still_accepts_idempotent_retries(self):
        for i in range(100):
            item = dict(self.payload, clientId=f"daily-{i}")
            self.assertEqual(200, self.request("POST", f"/v1/rooms/{self.room}/posts", item, self.alice)[0])
        self.assertEqual(429, self.request("POST", f"/v1/rooms/{self.room}/posts", dict(self.payload, clientId="one-too-many"), self.alice)[0])
        self.assertEqual(200, self.request("POST", f"/v1/rooms/{self.room}/posts", dict(self.payload, clientId="daily-0"), self.alice)[0])

    def test_membership_remains_private_after_restart(self):
        self.join_bob()
        self.request("POST", f"/v1/rooms/{self.room}/posts", self.payload, self.alice)
        self.app = Application(Store(Path(self.directory.name) / "rooms.sqlite3"))
        self.assertEqual(1, len(self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.bob)[1]["posts"]))
        self.assertEqual(404, self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.eve)[0])


if __name__ == "__main__":
    unittest.main()
