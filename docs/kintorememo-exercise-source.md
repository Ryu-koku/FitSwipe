# 筋トレMEMO 初期種目の取得元

取得日: 2026-11-08

- 対象: 筋トレ管理アプリ「筋トレMemo」Android版 2.10.1（versionCode 121）
- package: `com.maketore.kintorememo`
- 公式掲載: https://play.google.com/store/apps/details?id=com.maketore.kintorememo&hl=ja
- 配布ページ: https://apkpure.net/gym-get-fit-workout-schedule/com.maketore.kintorememo
- 取得URL: https://d.apkpure.net/b/XAPK/com.maketore.kintorememo?version=latest
- 取得XAPK SHA-256: `cc747a22808a9f585ffd3d3b0ed792a9276fd0bb3949c4b2fa2a66de7490606e`
- base APK SHA-256: `cd832def1e8c341bf9366eb44528d35563553c9e735bea6073f855742ed90e44`

配布ファイルを実行せず、manifestと初期種目の定数データを読み取りました。
`classes5.dex` の `com.maketore.kintorememo.db.DataGenerator` が持つ日本語初期種目配列
`EVENT_{CHEST,BACK,LEG,SHOULDER,ARMS,ABS,AEROBIC}_JP` を照合しています。
アプリのコード・画像・説明文は取り込まず、種目名と部位だけを
`mobile/src/data/kintorememo-exercises.json` に保存しています。

| 元の部位 | 件数 | FitSwipeの部位 |
| --- | ---: | --- |
| 胸 | 9 | 胸 |
| 背中 | 5 | 背中 |
| 脚 | 5 | 脚 |
| 肩 | 5 | 肩 |
| 腕 | 4 | 腕 |
| 腹筋 | 2 | 腹 |
| 有酸素運動 | 1 | 有酸素運動 |
| 合計 | 31 | |

対象は上記Android版の初期登録種目です。iOS版やユーザー独自の追加種目を網羅したという意味ではありません。
ランニングも種目名として登録しますが、時間・距離専用の入力方式は今回追加していません。
筋トレMEMOの人気TOP50はユーザー独自種目を含み得る別の集計なので、初期種目一覧と混合していません。

既存7種目と同名の5種目（ベンチプレス、ラットプルダウン、レッグプレス、スクワット、プランク）は再登録しません。
初期状態からは26種目増え、合計33種目になります。
既存ユーザーは一度だけ不足分を補完します。既存のID、名称、部位、左右別設定、アーカイブ、プリセット、記録は維持します。
適用済みバージョンを保存・同期し、その後に改名・非表示にした種目を再作成しないようにしています。
