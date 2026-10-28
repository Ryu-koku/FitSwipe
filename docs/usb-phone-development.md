# USB実機での開発

このチェックアウトの `develop` で作業し、次でExpo版の型チェック・lint・テスト・ネイティブ生成・ビルド・実機更新・起動を行う。

```sh
bash scripts/install-phone.sh
```

laptopを起動してUSB接続とUSBデバッグの許可を維持する。laptop側のADBサーバーは事前に `adb start-server` で起動する。
サーバーから専用SSH鍵でlaptopに接続し、localhost:15037をlaptopのlocalhost:5037へ転送する。ADBはLANやインターネットに公開しない。

- 開発版: `dev.local.fitlogsolo.expodev` / FitSwipe Dev。Kotlin版 `.usbdev` とPlay版のどちらとも別アプリ。
- ネイティブディレクトリはExpo Prebuildで生成し、手編集しない。
- Play版や既存Kotlin版とは別アプリ・別データ。既存アプリのデータを削除・上書きしない。
- ルームAPIは本番を使用するため、テスト用アカウントとルームを利用する。
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` を設定するとGoogleログインも実機確認できる。未設定でもログイン必須画面は表示されるが、認証は完了しない。
- 変更の反映にはコマンドの再実行が必要（保存直後の自動反映ではない）。
- 自動pull、コミット、mainへのマージ、Play配信は行わない。
- `PHONE_SSH_HOST`、`PHONE_SSH_KEY`、`PHONE_ADB_PORT`、複数端末時の `PHONE_SERIAL` で接続先を指定できる。
- SSHトンネルは再起動後にコマンドで再接続。接続が切れた場合はlaptopの起動・ネットワーク・ADBを確認する。
