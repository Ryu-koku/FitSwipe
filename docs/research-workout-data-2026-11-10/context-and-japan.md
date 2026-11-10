# 日本語サービス・自重スキル・身体変化・比較条件の調査

調査日: 2026-11-10。製品の公開ページ、ヘルプ、開発者によるストア説明を確認。公開説明上の掲載内容と、FitSwipeへの提案を区別する。各製品を購入・実機操作しての比較ではない。ストアの地域・OS・プラン・公開時期による違いがある。

## 重要な所見

- 「前回」を探す表示から「この条件なら次に何回を狙うか」へ進むと、データが行動につながる。REPLOGには重量変更時の記録更新に必要な回数、次セットの目安が掲載されている。
- 補助あり、ジムごとのマシン、片手/両手、自重の取り扱いは比較の前提となる情報。kgの大小だけで成長を判定しない。
- 体重の生データと平滑化したトレンドを分ける例がある。単日の上下と長期変化の混同を減らす設計になる。
- 自重では重量以外に、達成スキル、補助の減少、保持時間、難しい変化への進行が必要。CalistreeのReadinessは類似種目の経験からの技能到達度であり、一般的な「今日の体調」の意味とは異なる。
- 外部との比較には母集団が必要。Strength Levelの基準は投稿された挙上データ、GymStreakは同アプリの利用者の記録からの推定値。一般人口の順位に置き換えない。
- 身体データの推定値・機器独自値・医療/研究向けの値は、筋トレ記録の基本データから分離する。

## 根拠ページ

以下のR番号は、統合カタログの出典番号として使用する。

| ID | サービス・資料 | 公開資料で確認したこと | URL |
| --- | --- | --- | --- |
| R01 | 筋トレMEMO / 開発者ストア説明 | 重量・回数・補助の有無、細かな部位、種目履歴、RM、部位ごとの前回からの経過時間、画像共有 | https://apps.apple.com/jp/app/id1109688815 |
| R02 | REPLOG / 開発者ストア説明 | 前回記録、PR、重量変更時のPR更新に必要な回数、次セット目安、ジムごとのマシン重量、Watchで心拍・推定消費カロリー | https://apps.apple.com/jp/app/id6792484714 |
| R03 | レップログ / AMETENのストア説明 | 週の負荷をカレンダー横で比較、部位セットの人体図、連続週・月のPR・月比較・年マップ、総負荷/最大重量/e1RM | https://apps.apple.com/jp/app/id6799612395 |
| R04 | Tailrep / 公式 | e1RM・週次の部位別ボリューム・PR、並べ替え可能なダッシュボード、7種の記録方式、セット/種目メモのピン留め | https://tailrep.com/ |
| R05 | Tailrep / 分析機能 | 分析ページの存在と指標を確認。ページ内で取得できる説明は限定的なためR04を主な根拠にする | https://tailrep.com/features/analysis |
| R06 | Lift1up / 公式 | 重量・回数の推移、PR、体重・体脂肪率・筋肉量、写真の比較/重ね合わせ、次の通知日時。写真は端末に保存する説明 | https://lift1up.app/ |
| R07 | BurnFit / 日本語公式 | セット別%1RM・6段階強度、期間/種目別傾向、部位別ボリューム・セット数・疲労マップ、食事/PFCタイムライン | https://burnfit.io/ja/ |
| R08 | BurnFit / 公開FAQ | 週の各運動日を時間またはボリュームで比較 | https://burnfit01.oopy.io/1508af48-9376-803d-bf82-fe677881c32e |
| R09 | Last Rep Pro / 公式 | 計画重量・回数・セット、トップセット、e1RM、ボリューム、部位傾向、PDF/Excelで見返す導線 | https://last-rep-pro.web.app/ |
| R10 | Calistree / Skill trees | 易しい/難しい変化への経路、難度帯、実施/習熟の状態 | https://calistree.app/knowledge?id=skillTrees |
| R11 | Calistree / Progress analytics | 筋肉の回復マップ、筋力/柔軟/バランス/有酸素の経験プロファイル、目標・種目到達度、XP、年次振り返り | https://calistree.com/features/progress-analytics/ |
| R12 | Calistree / Experience profiles | 履歴からの疲労・回復・超回復・脱トレーニングの独自推定、今後7日間の予測表示という説明 | https://calistree.app/knowledge?id=experienceProfiles |
| R13 | Calistree / Mastery | 1セッション内の回数または保持秒数による習熟判定 | https://calistree.app/knowledge?id=tipMastery |
| R14 | Calistree / Readiness | 類似種目の経験をもとにする技能到達度。体調スコアとは区別が必要 | https://calistree.app/knowledge?id=tipReadiness |
| R15 | Calistree / Assistance and resistance | バンド・重量による補助/抵抗を種目変化として保持 | https://calistree.app/knowledge?id=tipResistAssist |
| R16 | Calistree / Resistance band standard | 100%伸長時の張力F100を比較基準にする。別の伸長率からの換算は近似と表示し、本人が修正できる | https://calistree.app/knowledge?id=resistanceBandStandard |
| R17 | Thenics / 開発者ストア説明 | スキルごとの段階的な変化、目標別の計画、セット・回数・進行を記録 | https://play.google.com/store/apps/details?id=com.abad.thenics |
| R18 | PlayThenics / 公式 | 期間を明示した指標、休息を含む継続、データ不足時のCalibrating、根拠セットへの導線。独自の量/回復モデルの精度は未検証 | https://playthenics.com/ |
| R19 | Strength Level / 基準 | 同種目・体重・年齢・性別で比較するコミュニティ基準 | https://strengthlevel.com/strength-standards |
| R20 | Strength Level / FAQ | レベルのパーセンタイル定義、バー重量を含む入力、単一セットで計算、投稿データの品質チェック | https://strengthlevel.com/faq |
| R21 | GymStreak / 自社データ分析 | 推定1RMの比較、集団サイズと母集団の明記、一般人口を代表しない説明 | https://www.gymstreak.com/research/strength-standards |
| R22 | OpenPowerlifting / FAQ | 大会全体の結果を文脈ごと記録し、個人PRだけを独立して登録しない方針 | https://www.openpowerlifting.org/faq |
| R23 | IPF / GL Formula | 競技結果を体重などの条件に応じて比較するIPF GL Points | https://www.powerlifting.sport/rules/codes/info/ipf-formula |
| R24 | InBody / App | 身体組成の履歴と部位分布の表示 | https://inbodyusa.com/inbody-app/ |
| R25 | InBody / 結果解説 | 体重、骨格筋量、脂肪、部位別除脂肪、水分、BMI、周囲径、身体組成履歴、独自スコア等。全てをFitSwipeに推奨する意味ではない | https://qr.inbody.com/ri/770/adult/en |
| R26 | MacroFactor / Weight Trend | 生の体重と、過去のデータから推定するトレンドを別表示 | https://help.macrofactorapp.com/dashboard/weight_trend |
| R27 | MacroFactor / Change Rate | トレンド体重の一定期間の変化を週あたりに換算して表示 | https://help.macrofactorapp.com/en/articles/19-change-rate |
| R28 | ABC Trainerize / Insights | 遵守、予定・実績、睡眠/歩数/体重・週平均/身体組成/写真、チェックインを並べ、表示を選択する | https://help.trainerize.com/hc/en-us/articles/46648417703956-Using-the-Client-Insights-Dashboard |
| R29 | Physitrack / Patient progress | 予定した運動の実施、痛み、患者の経過を確認する専門家向け画面 | https://support.physitrack.com/article/376-track-the-progress-of-your-patient |
| R30 | Physitrack / Adherence definition | 処方した運動に対する実施の集計定義 | https://support.physitrack.com/article/46-how-is-patient-adherence-calculated |
| R31 | Hevy / 公開フィードバック（2024） | 前回比較、部位別の週/月セット表、グラフから元記録、時間間隔を正しく示す軸等の利用者要望。自己選択された少人数で需要の順位は示さない | https://www.reddit.com/r/Hevy/comments/1fvy81l/graphs_and_data_in_hevy/ |

## 観察から整理した独自の表示候補

1. 重量を変えたときの「PR更新に必要な回数」。実測の同重量PRと、e1RMからの推定必要回数を区別する。
2. ジム・マシンごとの記録。違う機器の同じkgをそのまま比較しない。
3. 補助あり/なし、加重/アシストの別。アシスト重量の減少が進歩になる。
4. バンドの張力基準と換算元。メーカーの色名だけを負荷に置き換えない。
5. 部位ごとの「前回から何日」。ログのない部位を回復済みとは断定しない。
6. カレンダーの隣に週集計を置く表示。カレンダーと別の分析画面を往復しなくて済む。
7. カレンダーの実施部位、週あたりの実施日数、月比較、年全体の履歴。
8. トップセットと、全セットをまとめた結果の並置。
9. セットメモのピン留めで、次回に必要なセッティングや注意点を表示。
10. 重量がない種目の保持時間・技能段階・達成条件。
11. スキルツリーで、到達済み・練習中・次に必要な前提動作を分ける。
12. 習熟を示す回数/保持時間の要件と実績。
13. 一般的な回復と、次のスキルへの到達度を別名称で表示。
14. 強さ・柔軟・バランス・有酸素の個別プロファイル。
15. 現在の重量とトレンド体重、体重の変化速度、目標の残量。
16. 身体写真の日付・条件と重ね合わせ。見た目の比較を自動で筋肉量と呼ばない。
17. 同じ測定方法・同じ機器の身体組成推移。
18. 部位別除脂肪や水分由来の値を、負荷マップや実測筋力と別に扱う。
19. 体重比の筋力と、比較対象が明記された順位・レベル。
20. 大会での成功/失敗試技、記録条件、公式結果と練習記録の区別。
21. コーチへの実施・症状・感想・質問のタイムライン。
22. 欠測中・校正中・十分なデータなしを明示する表示。
23. 過去最高、前回より改善、目標の達成を別の実績として扱う。
24. 並べ替え/非表示が可能なウィジェット。表示候補の多さが既定画面の多さを意味しない。

## FitSwipeの現在のデータとの照合

`mobile/src/types.ts` と現行の `home-progress.ts`、`app/growth.tsx`、`app/workout.tsx`、`components/SessionDetails.tsx` を確認。

- 既存の記録: セッション開始/終了、種目、セット順、重量・回数、左右別、完了/スキップ、プリセット、部位の属性、体重・体脂肪率・身長。
- 既存の表示: 種目別の最大重量/最多回数/e1RM、PRと達成日、履歴、成長・PR更新の種目間ランキング、カレンダー、継続週、記録中の前回値、部位別ルームではなく月間の完了セット比較。
- 追加の集計だけで作れる候補: 同重量での回数比較、同回数での重量比較、実測RM表、直近の傾向、週の実施頻度、既存の部位分類の範囲でのセット数、完了/スキップの結果。
- 保存項目が必要: ウォームアップ分類、RPE/RIR、実際のセット開始/終了、実休憩、痛み・筋肉痛、フォーム条件、機器ID、元の計画のスナップショット。
- `createdAt`/`updatedAt` は実際の挙上時刻や休憩の計測ではない。セッション時間に休憩・中断等が混在するため「実動時間」と呼ばない。
- 計画した値を実績で上書きしてしまう場合、後から正確な「計画対実績」は復元できない。

## 探索の経過と終了条件

- 1巡目: 日本語の記録アプリ。前回値、PR、RM、総負荷、部位、共有。
- 2巡目: 日本語の小規模サービスと公式ヘルプ。次の回数、機器ごとの条件、体重トレンド、写真比較、チェックイン、欠測表示が追加。
- 3巡目: 自重と競技・身体組成。技能の前提、保持時間、補助量、比較の母集団、計測方法が追加。
- 4巡目: 深い用語を確認。Calistreeのバンド基準は有意な追加。`Dynamic device volume` は運動量ではなく音楽の音量調整であり、データ候補から除外した。
- 統合段階で他3担当の未収載候補を照合し、実際に新しい判断を支えるデータか、既存項目の別名/描画方式かを判定する。世界中に未発見の表示が存在しないことまでは証明できない。公開資料に基づく筋トレ記録の範囲内で、分類の空白を埋めた時点を区切りとする。

## 取得できず、事実確認に使わなかったもの

- REPRA公式: 検索結果には共有の説明があったが、本文が0行のため主な製品比較には入れない。
- InBody MEA解説と研究用FAQ: 今回は本文取得がタイムアウトしたため、取得できた公式App/結果解説を使用。
- ウェアラブルの旧い精度研究: 現行機種の評価には転用しない。消費カロリーは表示候補として挙げ、真値という扱いはしない。
