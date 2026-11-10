# 引き継ぎ後の追加探索と統合上の補正

確認日: 2026-11-10。元タブ `structured-agent-session-codex_3441954d_4d6e_486d_ba5d_f0c6835d96be` の依頼、会話、保存済み4分野のノートを読み、未完了だった比較・統合作業を再開した。元の依頼は「筋トレのデータとして何が表示されると体験がよいか。競合を深く探索し、候補を出し尽くす」。11/9のUI対応は別の完了済み作業である。

## 追加確認した領域

記録・適応処方・身体変化・専門計測の間に残る空白として、サーキットのスコア、種目間の能力差、競技試技、クライミングの条件付き技能記録、任意の周期記録、セットの意味を確認した。以下の資料は引き継ぎ後に本文を開いて確認。古いヘルプの公開年を現行バイナリの検証年と取り違えない。

| 記号 | 公式資料 | 確認範囲と限界 |
|---|---|---|
| U01 | [SugarWOD: New Scoring Capabilities](https://www.sugarwod.com/2018/05/advanced-scoring-capablities/) | 時間、rounds+reps、重量、距離、points、チェック、主観、非採点。複数ラウンドの合計・最良・最悪・平均。2018年の公開説明で、現行全画面は未操作。 |
| U02 | [btwb: Imbalances](https://support.btwb.com/en/support/solutions/articles/35000172954-how-does-the-imbalances-feature-work-) | 種目別の集団内レベル差、比較対象、欠測、unbroken条件。Appは直近1年、Web説明に6か月が混在。2021年更新。身体の障害・筋の不均衡の診断ではない。 |
| U03 | [Ironwise: Performance Profile](https://www.ironwise.app/learn/performance-profile) | 競技実績、試技位置別成功率と母集団、種目比、体重階級推移、練習自己申告との分離。サービス自身の説明で、順位モデルの独立検証ではない。 |
| U04 | [Crimpd: Summer 2026 Updates](https://crimpd.com/blog/summer-2026-updates/) | grade、試行数、sent、board/layout、角度、hold、最大/通常/flashの履歴。tagの高度なAnalyticsは将来予定の説明なので、現在のログ表示と分離。2026-08-27。 |
| U05 | [Crimpd: Getting Started](https://www.crimpd.com/docs/getting-started/) | 完了率の自己申告、難度、平均grade、カテゴリー別回数/分、週と3か月の分布。分の集計と独自workload scoreを同一視しない。 |
| U06 | [MacroFactor Workouts: Track Your Period](https://help.macrofactorapp.com/en/articles/282-track-your-period) | 日付単位の任意記録と表示のオン/オフ。周期からの自動処方・因果推定はこの資料では確認できない。 |
| U07 | [Strong: Set Tags](https://help.strongapp.io/article/166-set-tags) | WU/drop/failure、成功回数と追加の失敗試技、0成功回。2021年更新。 |
| U08 | [Strong: Supersets / Circuits](https://help.strongapp.io/article/98-how-do-i-create-supersets) | グループを線で表示し、A1/B1/A2/B2の順に案内。OSによって作成手順が異なる。 |
| U09 | [Hevy: Workout Settings](https://help.hevyapp.com/hc/en-us/articles/33882110558743-Workout-Settings-Preferences-Timer-Warm-up-calculator-Plate-Calculator-Smart-Superset-Scrolling) | WUを総セット/量/PRに含める設定がある。筋群別セットの別ヘルプの「WUを含む」と適用範囲が同じかは未確定。 |
| U10 | [Hevy: Sets per Muscle Group](https://help.hevyapp.com/hc/en-us/articles/44128140257431-How-Does-Sets-per-Muscle-Group-Work) | 主働筋1、副働筋0.5、WUを含むという当該画面の説明。 |
| U11 | [MacroFactor: Workouts Dashboard](https://help.macrofactorapp.com/en/articles/275-getting-to-know-your-workouts-dashboard) | 週目標、外部負荷/自重の量の分離、寄与種目、身体・周期、表示のカスタマイズを再確認。 |
| U12 | [Gravl: Recommended Weights](https://gravl.ai/help/gravl-science-understand-your-recommended-weights) | 前回・余力・種目順による提案理由、セット別分析、ジム別machine 1RMを再確認。2026-09-27更新。 |
| U13 | [TrainHeroic: Readiness](https://support.trainheroic.com/hc/en-us/articles/18156547276557-Athlete-Pro-Readiness) | 個人の通常範囲と短期/長期の主観的傾向を再確認。 |
| U14 | [Tindeq: Progressor](https://tindeq.com/p/) | スマホへ接続する力センサー、計測/接続/電池の状態。既出の力計測系統を補強し、新しい系統には数えない。 |
| U15 | [btwb: Programming Analysis](https://support.btwb.com/en/support/solutions/articles/35000172953-how-do-i-analyze-my-programming-) | 種別・modality・時間・回数・負荷・schemeの分布。既出の構成比と集計条件を補強する資料。 |
| U16 | [SmartGym 7.9](https://smartgymapp.com/releases/smartgym-7-9) | workout後の主観強度とtraining load。既出のsession RPE系統の補強。 |
| U17 | [Hevy: Set Types](https://help.hevyapp.com/hc/en-us/articles/34896293707927-Set-Types-in-Hevy-Explained-Drop-Sets-Warm-Up-Sets-and-More) | 成功回数と失敗試技、dropで休憩を起動しない等。0回を入力できない説明があり、Strongと仕様が異なる。 |
| U18 | [BurnFit 日本語公式](https://burnfit.io/ja/) | 食事のタイムライン、摂取カロリー、PFC。販売ページの平均成長率等は効果の証拠として採用しない。 |
| U19 | [Calistree: Progress Analytics](https://calistree.com/features/progress-analytics/) | 技能習熟に基づく累積XP。実測の生物学的年齢や全身能力ではない。 |
| U20 | [Dr. Muscle X: 2026](https://dr-muscle.com/new-dr-muscle-x-2026/) | 入力体重/体脂肪率に基づく除脂肪量。新Home/period reviewのプレビューとは分ける。 |
| U21 | [Tonal: Weekly Targets](https://knowledge.tonal.com/kb/guide/en/how-to-use-personalized-weekly-targets-IcOTXeWcYl/Steps/4353081) | MQ/FSは目的に合う内容を含むワークアウトに割り当てられた点の週合計。本人のフォーム計測結果とは別。 |
| U22 | [REPLOG 開発者のストア説明](https://apps.apple.com/jp/app/id6792484714) | Apple Watchで心拍・消費カロリーを表示する説明。独立した精度検証ではない。 |

## 追加の観察・表示案

「観察」は公式公開資料での説明。「設計案」はこの比較から考えた候補であり、その一式を競合が実装しているという意味ではない。統合カタログでは既出と同じ判断を支える行を併合し、以下の細部を別名として保持する。

| ID | 表示するもの | 役立つ判断 | 区分・根拠 |
|---|---|---|---|
| X01 | ベンチマークの名称・定義と過去の自己記録 | 同じ課題を再実施した成果か | 観察: SugarWOD U01。定義の版固定は設計案。 |
| X02 | AMRAPの完了rounds+端数reps | 制限時間内の達成量 | 観察: SugarWOD U01 |
| X03 | For Timeの完了秒数・短縮量 | 同じ課題をより短く終えたか | 観察: SugarWOD U01。短縮量の見せ方は設計案。 |
| X04 | ラウンド合計・最速・最遅・平均 | 後半の失速とペース配分 | 観察: SugarWOD U01 |
| X05 | RX/Scaledと変更した動作・負荷 | 速さと課題の難度を混同しない | 観察: TrainHeroic（coaching.md C67）。変更箇所を構造化するのは設計案。 |
| X06 | 高い方がよい/低い方がよい/採点なしの指標方向 | 時間短縮を減点しない | 設計案: SugarWOD U01の複数score typeから |
| X07 | 種目ごとの集団内レベルを並べた能力差 | 単純なkgの比では見えない得手不得手 | 観察: btwb U02。原因の診断はしない。 |
| X08 | 比較に不足する種目・有効な記録期間 | なぜ能力差をまだ出せないか | 観察: btwb U02 |
| X09 | 第1/2/3試技の成功率と件数・比較集団 | 一発の最高値以外の試技の再現性 | 観察: Ironwise U03。件数併記は設計案。 |
| X10 | Snatch/Clean & Jerk/Totalの比と推移 | 得意な種目と練習テーマ | 観察: Ironwise U03。万人の理想比とは扱わない。 |
| X11 | 公式大会結果と自己申告の練習ベストを区別 | 記録の条件と由来 | 観察: Ironwise U03 |
| X12 | 体重階級の変更と競技記録の時間軸 | 階級移動の前後を理解 | 観察: Ironwise U03 |
| X13 | クライミングのgrade・試行数・完登/未完登 | 同じ難度に対する成功と試行効率 | 観察: Crimpd U04 |
| X14 | board/layout・壁角度・hold種類の条件 | 別課題の同じgradeを過度に比較しない | 観察: Crimpd U04。高度なtag別Analyticsは予定機能。 |
| X15 | 最大/通常セッション/一撃flashの別々の技能履歴 | 過去一度の最高難度と再現できる難度 | 観察: Crimpd U04 |
| X16 | 筋力・持久力・技術等のカテゴリー別実施分数 | 筋群以外の練習配分 | 観察: Crimpd U05 |
| X17 | 自己申告の25/50/75/100%完了と実セット数を別表示 | 大まかな報告と詳細な実績の差 | 観察: Crimpd U05。実セットとの並置は設計案。 |
| X18 | 任意の月経記録日を訓練カレンダーの文脈として表示 | 自分の体感と実績を振り返る | 観察: MacroFactor U06。非表示可能にし、自動の能力断定へ使わない。 |
| X19 | 通常・warm-up・drop・failure等のセット種別 | そのセットの目的と集計対象 | 観察: Strong U07、Hevy U17 |
| X20 | superset/circuitの所属とA1→B1の実施順 | 何を交互に行い、何が残るか | 観察: Strong U08 |
| X21 | 成功0回の試技、成功後の追加失敗、skipを別記録 | 挑戦と未実施を混同しない | 観察: Strong U07。Hevy U17には0入力の制約。 |
| X22 | WUを含む/除外する設定と、影響を受ける統計名 | 集計設定変更で数字が変わった理由 | 観察: Hevy U09/U10、Strong U07 |
| X23 | 保存前に記録を確認・修正できる結果一覧 | 誤記録を後の統計へ持ち込まない | 観察: Crimpd U04 |
| X24 | 同重量のセット別回数、1セット目からの保持率 | 後半セットの変化 | 設計案。重量・左右・セット位置を揃え、休憩等の未記録条件を付記。 |
| X25 | 同じ種目/課題の量÷セッション経過分 | 限られた時間での実施密度 | 設計案。休憩・中断を含む記録密度であり、筋肥大効率や実動密度とは呼ばない。 |
| X26 | 直近n回の変化、横ばい期間、根拠回数 | 一度の不調と続く横ばいを分ける | 設計案。横ばいは悪いこととは限らず、停滞の原因診断はしない。 |
| X27 | 計画変更日・実施量の変化・後の記録を同じ軸に置く | ブロックを振り返る材料 | 設計案。前後関係から因果を断定しない。 |
| X28 | 残りの予定セットと、残り時間に対する所要時間の目安 | 時間内でどこまで行えるか | 設計案。セット/休憩の実時刻と中断記録が必要。 |
| X29 | 目的ごとに今追う1つの指標とその達成条件 | 毎回読む数値を減らす | 設計案。StrongのFocus Metric、Tonalの目的別目標が参考。 |
| X30 | 推定値の対象データ数・測定のばらつき・対象外条件 | 推定値の確からしさ | 設計案。未検証の「±2kg」「95%」等を付けない。 |
| X31 | 修正/取込/削除による再集計の前後と理由 | 実施していない日にグラフが変わった理由 | 設計案。時系列の変更履歴の保存が必要。 |
| X32 | 体重比指標の分母となる体重と測定日 | 古い体重で割っていないか | 設計案。Gravlの評価時体重表示も参考。 |
| X33 | 今週ここまでと先週同曜日までの差分 | 未完週と完了週の誤比較を防ぐ | 設計案。完了週のみ比較するLiftosaurの方式を補完。 |
| X34 | 左右の記録重量・回数・量の差と件数 | 入力上の偏りを振り返る | 設計案。力の配分・身体の機能差を測ったとは表示しない。 |
| X35 | 部位分類不明のセット数と集計対象外の理由 | マップに現れないデータへ気づく | 設計案。自由記述の部位名を無理に細かな筋へ推定しない。 |
| X36 | 食事の時系列・摂取kcal・たんぱく質/脂質/炭水化物 | 食事の記録を訓練・身体変化と併せて振り返る | 観察: BurnFit U18。個人の必要量の処方とは別。 |
| X37 | 歩数の原値・期間平均と筋トレ日の関係 | 筋トレ以外の普段の活動量 | 観察: MacroFactor U11。関係の読み方は設計案。 |
| X38 | ウォッチ等の推定消費kcalと取得元 | 心拍由来の運動量の参考 | 観察: REPLOG U22。実測エネルギーや筋肥大成果と扱わない。 |
| X39 | 入力体重/体脂肪率からの推定脂肪量・除脂肪量 | 体重の上下の内訳を振り返る | 観察: Dr. Muscle U20。除脂肪量を筋肉量と呼ばない。 |
| X40 | 習熟に基づく累積XP・技能の達成履歴 | 最高重量以外の積み重ねを認める | 観察: Calistree U19。XPはサービス内の定義。 |
| X41 | 機能的動作/動作品質を鍛える構成の週スコア | 計画で選んだ練習内容を振り返る | 観察: Tonal U21。MQ/FSは内容に割り当てた点の集計で、本人のフォームの実測点ではない。 |

## FitSwipeのデータを再確認して補正した点

- `WorkoutSet.setOrder` は種目内のセット順。`WorkoutProgress.exerciseOrder` は進行中の状態であり、終了セッションに実際の時系列の種目順を固定保存する専用フィールドはない。セット一覧の並びから実施順を断定しない。
- `WorkoutSession.presetId` で同じプリセットを探せるが、プリセットは変更できる。作成時の処方・版・当初のセット数を保存したものではない。
- `createdAt`/`updatedAt` は生成・変更時刻。挙上開始/終了、実休憩、器具待ち、中断を分離していない。
- 重量0の記録は`isBodyweight()`で便宜的に自重扱いされる。種目ごとの身体質量寄与、assistance、外部加重を区別した専門的な自重量モデルではない。
- 完了フラグと`finalSkippedSide`等はあるが、成功0回の試技/技術的失敗/未着手の完全な状態分類はない。既存の正の回数前提を無視して失敗回を集計しない。
- `Exercise.muscleGroup`は任意文字列1項目。主働筋/副働筋の多対多関係、寄与係数、細分化された標準辞書はない。
- 体重・体脂肪率・身長の履歴はある。RIR、WU種別、セットメモ、写真/動画、周囲径、症状、睡眠、センサー時系列は専用記録が必要。

## 追加探索の打ち切り条件

統合前の4ノートは合計283行の観察/候補を含む。そこへ上記41行を追加し、同じ事実を支える観察を併合した。回数・重量・時間・技能・主観・形態・運動学・力学・生理・比較条件・計画・由来の分類を埋めた後、btwbのprogramming、Strong/Hevyのセット種別、Tindeqの計測、Moxy/VALDの専門指標を狙って再探索した。終盤は既存分類内の尺度、集計条件、画面の場所、装置の違いが中心になった。最後に本文中にだけあった食事・歩数・消費kcal・身体組成・XP・目的別スコアも一覧へ回収した。

これは公開資料に基づく局所的な飽和である。市場の全製品、非公開ダッシュボード、実機限定機能、将来機能、研究上のあらゆるバイオマーカーの不存在を証明したものではない。筋トレ記録の体験に関係する範囲を対象とし、診断目的の検査を際限なく増やすことはしない。
