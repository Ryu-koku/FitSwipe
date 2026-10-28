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

    def enable_automatic(self, account=None):
        account = account or self.alice
        self.assertEqual(200, self.request("PUT", f"/v1/rooms/{self.room}/sharing", {"enabled": True}, account)[0])
        with self.store.connect() as db:
            db.execute("UPDATE room_sharing SET since_month='2020-10' WHERE room_id=? AND user_id=?", (self.room, account["id"]))

    def automatic_payload(self, client_id="auto-1", started="2020-10-10T00:00:00Z"):
        return {**copy.deepcopy(self.payload), "clientId": client_id, "startedAt": started, "endedAt": started}

    def compare(self, account=None):
        status, result = self.request("GET", f"/v1/rooms/{self.room}/comparison?month=2020-10", account=account or self.alice)
        self.assertEqual(200, status)
        return result

    def test_automatic_consent_upsert_delete_stop_and_legacy_deduplication(self):
        self.join_bob()
        base = f"/v1/rooms/{self.room}"
        payload = self.automatic_payload()
        self.assertEqual(403, self.request("PUT", base + "/auto-workouts", payload, self.alice)[0])
        self.assertEqual(404, self.request("PUT", base + "/sharing", {"enabled": True}, self.eve)[0])
        self.enable_automatic()
        manual = {**payload, "clientId": "old-installation-session"}
        self.request("POST", base + "/posts", manual, self.alice)
        payload["legacyClientId"] = manual["clientId"]
        for _ in range(2):
            self.assertEqual(200, self.request("PUT", base + "/auto-workouts", payload, self.alice)[0])
        self.assertEqual(1, self.compare()["rankings"][0]["sets"])
        self.assertEqual(1, len(self.compare()["posts"]))
        payload["exercises"][0]["sets"].append({"order": 2, "reps": 8, "weightKg": 65})
        self.request("PUT", base + "/auto-workouts", payload, self.alice)
        self.assertEqual(2, self.compare(self.bob)["rankings"][0]["sets"])
        self.assertEqual(0, self.compare()["rankings"][1]["sets"])
        self.request("DELETE", base + "/auto-workouts/auto-1", account=self.bob)
        self.assertEqual(2, self.compare()["rankings"][0]["sets"])
        self.request("DELETE", base + "/auto-workouts/auto-1", account=self.alice)
        self.assertEqual(0, self.compare()["rankings"][0]["sets"])
        self.assertEqual([], self.compare()["posts"])
        self.request("PUT", base + "/sharing", {"enabled": False}, self.alice)
        self.assertEqual(1, self.compare()["rankings"][0]["sets"])
        self.assertEqual(1, len(self.request("GET", base + "/posts", account=self.alice)[1]["posts"]))
        self.assertEqual(403, self.request("PUT", base + "/auto-workouts", payload, self.alice)[0])

    def test_monthly_japan_boundaries_paired_sides_ties_and_whole_month_pagination(self):
        self.join_bob()
        self.enable_automatic()
        self.enable_automatic(self.bob)
        base = f"/v1/rooms/{self.room}"
        payload = self.automatic_payload(started="2020-09-30T15:00:00Z")
        payload["exercises"][0]["sets"] = [
            {"order": 1, "reps": 10, "side": "左"}, {"order": 1, "reps": 9, "side": "右"},
            {"order": 2, "reps": 9, "side": "左"}, {"order": 3, "reps": 0},
        ]
        self.request("PUT", base + "/auto-workouts", payload, self.alice)
        self.request("PUT", base + "/auto-workouts", payload, self.bob)
        result = self.compare()
        self.assertEqual([1, 1], [m["sets"] for m in result["rankings"]])
        self.assertEqual([1, 1], [m["rank"] for m in result["rankings"]])
        self.assertEqual(400, self.request("PUT", base + "/auto-workouts", self.automatic_payload("before", "2020-09-30T14:59:59Z"), self.alice)[0])
        self.request("PUT", base + "/auto-workouts", self.automatic_payload("after", "2020-10-31T15:00:00Z"), self.alice)
        with self.store.connect() as db:
            for i in range(55):
                item = self.automatic_payload(f"many-{i}")
                db.execute("INSERT INTO auto_workouts(id,room_id,user_id,client_id,created_at,payload) VALUES(?,?,?,?,?,?)", (f"row-{i}", self.room, self.alice["id"], item["clientId"], item["startedAt"], json.dumps(item)))
        result = self.compare()
        self.assertEqual(56, result["rankings"][0]["sets"])
        self.assertEqual(50, len(result["posts"]))
        status, page = self.request("GET", base + "/comparison?month=2020-10&cursor=" + result["nextCursor"], account=self.bob)
        self.assertEqual(200, status)
        self.assertEqual(7, len(page["posts"]))
        self.assertEqual(56, page["rankings"][0]["sets"])
        self.assertEqual(400, self.request("GET", base + "/comparison?month=2020-13", account=self.alice)[0])
        self.assertEqual(400, self.request("GET", base + "/comparison?month=2020-10&cursor=-1", account=self.alice)[0])

    def test_leaving_and_account_deletion_cascade_automatic_consent_and_copies(self):
        self.join_bob()
        self.enable_automatic(self.bob)
        base = f"/v1/rooms/{self.room}"
        self.request("PUT", base + "/auto-workouts", self.automatic_payload(), self.bob)
        self.request("DELETE", base, account=self.bob)
        with self.store.connect() as db:
            self.assertEqual(0, db.execute("SELECT count(*) FROM auto_workouts").fetchone()[0])
            self.assertEqual(0, db.execute("SELECT count(*) FROM room_sharing").fetchone()[0])
        self.assertEqual(404, self.request("GET", base + "/auto-workouts", account=self.bob)[0])

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

    def test_account_deletion_revokes_token_and_transfers_rooms(self):
        self.join_bob()
        self.request("POST", f"/v1/rooms/{self.room}/posts", self.payload, self.alice)
        self.request("POST", f"/v1/rooms/{self.room}/posts", self.payload, self.bob)
        self.assertEqual(200, self.request("DELETE", "/v1/account", account=self.alice)[0])
        self.assertEqual(401, self.request("GET", "/v1/rooms", account=self.alice)[0])
        rooms = self.request("GET", "/v1/rooms", account=self.bob)[1]["rooms"]
        self.assertEqual(self.bob["id"], rooms[0]["ownerId"])
        posts = self.request("GET", f"/v1/rooms/{self.room}/posts", account=self.bob)[1]["posts"]
        self.assertEqual([self.bob["id"]], [post["userId"] for post in posts])

    def test_account_deletion_transfers_to_first_joiner_and_removes_empty_rooms(self):
        self.join_bob()
        code = self.request("GET", "/v1/rooms", account=self.alice)[1]["rooms"][0]["inviteCode"]
        self.request("POST", "/v1/rooms/join", {"code": code}, self.eve)
        empty_room = self.request("POST", "/v1/rooms", {"name": "alone"}, self.alice)[1]["id"]
        self.request("DELETE", "/v1/account", account=self.alice)
        rooms = self.request("GET", "/v1/rooms", account=self.eve)[1]["rooms"]
        self.assertEqual(self.bob["id"], rooms[0]["ownerId"])
        with self.store.connect() as db:
            self.assertIsNone(db.execute("SELECT id FROM rooms WHERE id=?", (empty_room,)).fetchone())

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
