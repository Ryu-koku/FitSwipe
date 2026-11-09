# 定番種目の補完（カタログ v2）

2026-11-08、ユーザーの「有名なのを適当に追加して」に基づき24種目を追加。
種目名・器具や動作の違いを下記ライブラリで確認し、既存にない基本的なバリエーションを選定した。
人気順・利用者数のランキングを示すものではない。

- NASM Exercise Library: https://www.nasm.org/workout-exercise-guidance
- Muscle & Strength Exercise Library: https://www.muscleandstrength.com/exercises/all.html
- University of Wyoming Exercise Video Library: https://www.uwyo.edu/rec/group-fitness/exercise-video-library.html

追加一覧は `mobile/src/data/common-exercises.json` に保存。
胸3、背中3、肩2、腕4、脚8、腹4種目。お尻の種目は既存の脚カテゴリへ分類。
ワンハンドダンベルロー、ブルガリアンスクワット、ランジは左右別で記録し、他は通常記録。
筋トレMEMOから取得した31種目の原本は変更しない。
新規ユーザーの初期種目は合計57種目。既存ユーザーにはv2の不足分だけを一度追加する。
v1適用後に改名・削除した旧種目を復活させず、非表示や独自設定を保持する。
