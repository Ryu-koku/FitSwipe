# FitSwipe app icon

2026-11-10の赤ペン回答 `app-icon-01` で、B「重なる記録カード」と「この候補を採用して進める」を選択。赤入れなし。

`approved.png` は採用された元画像そのもの。iOS・標準アイコンとfaviconはこれを縮小して使用する。Android用は同じ図柄から作った透過画像と白黒マスクを使う。

| Source | Purpose |
| --- | --- |
| `approved.png` | 採用画像、1254×1254 |
| `android-foreground-source.png` | カードとダンベルを残した背景透過版 |
| `android-monochrome-mask.png` | 単色テーマ用の白黒マスク。白を不透明、黒を透明に変換する |

全画像はbuilt-in `image_gen`で生成・加工した。元画像は変更せず保存。再生成用のプロンプトは `prompts.json` に記録する。

`node scripts/app-icons.cjs` で次のPNGを再作成できる（先にmobileの依存をインストールする）。

- `mobile/assets/icon.png`: 1024×1024、不透明。採用画像の構図・背景を保持。
- `mobile/assets/favicon.png`: 48×48、不透明。
- `mobile/assets/android-icon-foreground.png`: 1024×1024、透過、白・ミントのカードと青緑のダンベル。
- `mobile/assets/android-icon-background.png`: 1024×1024、不透明、`#006D67`。
- `mobile/assets/android-icon-monochrome.png`: 1024×1024、白の図形と透過したダンベル・背景。

Androidの前景・単色版は、端末ごとの切り抜きで欠けないよう、中心の直径64dp（全体108dp）の円内に余白を確保する。背景透過時の孤立したノイズは除き、色は保持する。画像の角丸加工はせず、OSのマスクに任せる。

設定は `mobile/app.json` の既存パスを使用する。端末のランチャーアイコン更新にはネイティブアプリの再ビルド・インストールが必要。

検証: 型チェック通過。lintはエラー0件、今回変更していない `settings.tsx` に未使用変数の警告1件。PNGの寸法・透過・単色マスク・Androidの安全領域を確認。Expo SDK 58による画像参照の解決と、一時ディレクトリで27個のAndroidネイティブアイコン素材・XMLの生成を確認した。端末へのインストール・公開は実施していない。

仕様参照: [Expo SDK 58 app config](https://docs.expo.dev/versions/v58.0.0/config/app/)、[Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)。
