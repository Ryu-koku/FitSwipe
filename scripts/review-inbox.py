#!/usr/bin/env python3
"""Review FitSwipe safety/support requests through authenticated Wrangler D1.

Uses the same account-deletion transaction as the API. No unauthenticated admin
HTTP endpoint is exposed. Output may contain personal information; do not paste
it into public issues or logs.
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKER = ROOT / 'rooms-server' / 'cloudflare'


def identifier(value):
    if not re.fullmatch(r'[a-f0-9-]{36}', value):
        raise argparse.ArgumentTypeError('UUIDを指定してください')
    return value


def quote(value):
    return "'" + value.replace("'", "''") + "'"


def main():
    parser = argparse.ArgumentParser(description='FitSwipe 通報・お問い合わせの運営用受信箱')
    parser.add_argument('--remote', action='store_true', help='公開D1を操作する。省略時はローカル')
    parser.add_argument('--config', help='Wrangler設定ファイルのパス')
    parser.add_argument('--persist-to', help='ローカルD1の保存先')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('inbox', help='未処理の受付と通報を一覧表示')
    for name in ['inspect-report', 'inspect-request', 'resolve-report', 'resolve-request', 'suspend', 'unsuspend', 'remove-post', 'reset-profile', 'remove-room', 'delete-account']:
        command = sub.add_parser(name)
        command.add_argument('id', type=identifier)
        if name in ['delete-account', 'remove-room']:
            command.add_argument('--confirm-id', type=identifier, required=True, help='本人確認・対象確認後に同じUUIDを指定')
    args = parser.parse_args()
    if hasattr(args, 'confirm_id') and args.confirm_id != args.id:
        parser.error('--confirm-id が対象IDと一致しません')
    target = quote(args.id) if hasattr(args, 'id') else None
    queries = {
        'inbox': "SELECT id,room_id,target_id,reason,created_at FROM safety_reports WHERE status='open' ORDER BY created_at; SELECT id,kind,created_at FROM support_requests WHERE status='open' ORDER BY created_at;",
        'inspect-report': f'SELECT * FROM safety_reports WHERE id={target};',
        'inspect-request': f'SELECT * FROM support_requests WHERE id={target};',
        'resolve-report': f"UPDATE safety_reports SET status='resolved' WHERE id={target};",
        'resolve-request': f"UPDATE support_requests SET status='resolved' WHERE id={target};",
        'suspend': f'UPDATE users SET suspended=1 WHERE id={target};',
        'unsuspend': f'UPDATE users SET suspended=0 WHERE id={target};',
        'reset-profile': f"UPDATE users SET name='トレーニー',avatar=NULL,avatar_custom=1 WHERE id={target};",
        # Tombstone the automatic copy and delete matching legacy manual copies
        # first so the comparison view cannot resurrect the reported content.
        'remove-post': f"INSERT OR IGNORE INTO hidden_workouts(room_id,user_id,client_id) SELECT room_id,user_id,client_id FROM posts WHERE id={target} UNION SELECT room_id,user_id,client_id FROM auto_workouts WHERE id={target} UNION SELECT room_id,user_id,legacy_client_id FROM auto_workouts WHERE id={target} AND legacy_client_id IS NOT NULL; DELETE FROM posts WHERE EXISTS(SELECT 1 FROM hidden_workouts h WHERE h.room_id=posts.room_id AND h.user_id=posts.user_id AND h.client_id=posts.client_id); UPDATE auto_workouts SET deleted=1,payload=json_set(payload,'$.presetName','削除済み','$.exercises',json('[]')) WHERE EXISTS(SELECT 1 FROM hidden_workouts h WHERE h.room_id=auto_workouts.room_id AND h.user_id=auto_workouts.user_id AND h.client_id IN(auto_workouts.client_id,auto_workouts.legacy_client_id));",
        'remove-room': f'DELETE FROM rooms WHERE id={target};',
        'delete-account': f'UPDATE rooms SET owner_id=(SELECT m.user_id FROM members m WHERE m.room_id=rooms.id AND m.user_id<>{target} ORDER BY m.rowid,m.user_id LIMIT 1) WHERE owner_id={target} AND EXISTS(SELECT 1 FROM members m WHERE m.room_id=rooms.id AND m.user_id<>{target}); DELETE FROM users WHERE id={target};',
    }
    command = ['wrangler', 'd1', 'execute', 'fitswipe-rooms', '--remote' if args.remote else '--local', '--json']
    if args.config:
        command.extend(['--config', str(pathlib.Path(args.config).resolve())])
    if args.persist_to:
        command.extend(['--persist-to', str(pathlib.Path(args.persist_to).resolve())])
    command.extend(['--command', queries[args.command]])
    result = subprocess.run(command, cwd=WORKER, capture_output=True, text=True)
    if result.returncode:
        sys.stderr.write(result.stderr)
        return result.returncode
    try:
        print(json.dumps(json.loads(result.stdout), ensure_ascii=False, indent=2))
    except json.JSONDecodeError:
        sys.stdout.write(result.stdout)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
