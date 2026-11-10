# 筋トレのデータ表示調査：適応コーチング・主観・疲労・プログラム

調査日：2026-11-10。担当範囲：Fitbod、RP Hypertrophy、JuggernautAI、Boostcamp、Gravl、Dr. Muscle、Evolve、TrainHeroic、Volt、MacroFactor Workoutsを主対象に、Alpha Progression、Liftosaur、Everfit、ABC Trainerize、TrueCoachで穴を埋めた。公式ヘルプ・公式リリース・開発元の機能ページを実際に開いて確認。アプリへのログイン操作や全画面の実機検証は行っていない。

「公式に説明されている表示」と「実際の入力」「裏側の推定」「こちらの表示案」を分離する。機能があることは、予測精度・筋肥大効果・事故予防・利用者需要の証明にはならない。以下でいう独自推定はメーカー実装の説明であり、独立した妥当性検証ではない。

## まず分かったこと

- コーチング系の価値は、重量の折れ線より「次にどうするか」と「なぜその提案か」にある。ただしこれは今回の比較からの設計上の推論であり、利用者研究の結論ではない。
- 新しさが大きいのは、本人の通常範囲との比較、推定の内訳、機材の制約による提案不能、今回だけの変更か将来にも残すか、スコア変動の原因分解、コメントを種目と時間に結び付ける表示。
- RPE/RIR、筋肉痛、パンプ、関節痛、主観的な回復は別の質問。ひとつの「疲労」へまとめると、何が変化したか分からなくなる。
- 回復%・readiness・strength scoreは単位や数式が違う。0–100という見た目が同じでも比較できない。
- 「未記録」「推定」「本人の自己申告」「センサー取込」「手動修正」「校正中」を区別できること自体が重要なデータ表示。

## サービス別に確認した表示

### 1. Fitbod

**確認できたもの。** Body/Recoveryに前後を回せる身体ヒートマップ、筋群ごとの回復0–100%、freshな筋群数、筋群をタップしたトレーニング/回復履歴。割合はセット・回数・重量などのログから算出し、本人が編集できる。Apple Health/Health Connectからの有酸素運動も反映する。これは筋肉の生理状態を直接測った値ではない。[Muscle Recovery](https://help.fitbod.me/hc/en-us/articles/360006269014-Muscle-Recovery)

**主観入力。** 種目の最終/最もきついセットを基準に、あと何回できたかを0/1/2/3/4+ RiRで入力。後から履歴で修正可能。将来の重量/回数に使われる。スーパーセット/サーキットの前種目由来の疲労は現状そのRIR解釈で補正しない、と公式に制限を明記する。したがって同じRIRでも実施条件を残す必要がある。[RiR](https://help.fitbod.me/hc/en-us/articles/360033133174-Reps-in-Reserve-RiR-Formerly-Exertion-Rating-RPE)

**計画。** 週何回/曜日、希望時間、split、4週間繰り返すFocus Exercises、利用機材と重量刻みを設定できる。週目標達成の連続週というstreakの定義がある。これらは主に計画の入力/設定であり、すべてが分析チャートとして表示されるとは断定しない。[My Plan](https://help.fitbod.me/hc/en-us/articles/34336407191191-My-Plan)

**注意。** 同社ブログでは全回復を7日とする旧記述、現ヘルプでは6日とする記述があり、普遍的な回復時刻ではなく実装ルールであることが特に明瞭。[同社ブログ](https://fitbod.me/blog/muscle-recovery/)

### 2. RP Hypertrophy

**確認できたもの。** 重量・回数・セット数の処方、パンプ・筋肉痛・ボリュームに対するきつさのフィードバック。これらを将来のセット数に使う。重量刻みが大きいと、重量を上げる代わりに回数を増やす場合がある。本人によるセット追加/削除も想定されている。[処方の決まり方](https://hypertrophy.zendesk.com/hc/en-us/articles/14605661323671-How-Does-the-App-Determine-When-to-Add-Weight-Reps-and-Sets)

**追加の主観データ。** 関節痛評価は運動フィードバックを開き直した際に前回記録が見える。完了したworkoutとskipしたworkoutを視覚的に区別する修正も明記されている。[公式リリース履歴・2026-08-03/08-19](https://releases.rpstrength.com/hypertrophy)

**停滞/休養。** underperformance flagと楽なトレーニングへの提案がある。最終週をdeloadとするブロック構成も説明される。ただしflagの発火閾値、痛みの尺度の全ラベル、筋肉痛/パンプの長期グラフは今回の公開資料では確定していない。[低パフォーマンスflag](https://hypertrophy.zendesk.com/hc/en-us/articles/13516219395735-If-I-get-a-flag-for-underperformance-what-do-I-do)、[Deload](https://hypertrophy.zendesk.com/hc/en-us/articles/24479674298391-All-About-Deloads)

**解釈。** パンプ/筋肉痛/関節痛は自己申告。そこから筋肉の成長量を測定したとは言わない。「パンプが大きいほど良い」の得点競争に変換しない。

### 3. JuggernautAI

**確認できたもの。** v3.0のダッシュボードはreadinessを0–100とゾーンで表示。年間workout完了カレンダー、睡眠と体重の傾向、現在のスクワット/ベンチ/デッドリフトとtotal、筋力グラフ。ブロック全体で過去の実績と将来の週を同時に見られ、種目履歴/lifetime maxへすばやくアクセスする。[v3.0公式リリース](https://www.juggernautai.app/blog/juggernautai-v3-0-is-here)

**適応の入力と時間軸。** セッション前の睡眠/気分/エネルギー/筋肉痛など、top/backdownセットRPE、セッション終了、週末、ブロック終了、大会/模擬大会終了のチェックイン。readinessは走行する重み付き平均として説明される。初期には弱点部位や生活要因も聞く。これらのすべての入力が独立した長期チャートになるとは公式記事からは言えない。[個別化の仕組み](https://help.jtsstrength.com/en/articles/3-how-juggernautai-is-individualized-to-you)

**解釈。** 0–100は独自標準化。MEV/MRVを推定して処方する説明があっても、個人の真の生物学的閾値を測定したものではない。

### 4. Boostcamp

**確認できたもの。** 最新の専用機能説明ではセットRPEを6–10、0.5刻みで記録し、各値に「あと何回できたか」の文章ヒントが付く。プログラムの目標RPE/範囲、RPEを含む1RM推定、目標よりきつかった場合の次回重量据え置きがある。[RPE logging・2026-10](https://www.boostcamp.app/features/rpe-logging)

**進行。** linear/double progression、種目ごとの重量刻み/増加頻度、次回の重量と回数。全セットの目標達成後に増量、目標RPE超過時は据え置き、どのセットもrep範囲下限未達なら負荷を下げる。理由の短文も示す。未経験種目/体重種目/時間距離AMRAP/%1RM計算済み種目など対象外を明示する。[Auto Progression](https://www.boostcamp.app/features/auto-progression)

**週の振り返り。** 完了workout数、時間、総挙上量、PR、筋群への配分、workout一覧、1回以上完了した連続週。週目標の完全達成とは異なるstreak定義。[Weekly Report](https://www.boostcamp.app/features/weekly-report)

**資料不一致。** 旧/総合ページにはRPE5–10・独立RIR欄とも書かれているが、専用の最新RPEページはRPE6–10とRIRヒント、独立RIR欄なしと説明する。表の厳密な尺度や独立フィールド有無はバージョン差として扱い、現物未検証のまま一方を断定しない。[総合機能ページ](https://www.boostcamp.app/features)

### 5. Gravl

**負荷提案の説明。** 種目内のInsightsに「Why 40 kg today?」のような見出しで、前回セッション、余力評価、今回の種目順を説明。詳細でセット別分析。種目完了時に余力を3択で答え、次回へ反映。機械種目の1RMはgym profileごとに分かれ、使える最大重量に達したら回数を増やす。初期推定と本人の実績を混同しない構造が参考になる。[推奨重量](https://gravl.ai/help/gravl-science-understand-your-recommended-weights)

**全身readiness。** ウォッチ/リング取込を有効にすると、0–100とReady/Moderate/Recoverを表示。前夜のHRV・安静心拍・睡眠などを本人の過去30夜と比較し、各因子が何点を足し引きしたかを表示。calibrating/前夜データ待ち/睡眠なしなどの欠測状態も説明。workout後は回復に向けた案内に変わる。このreadiness自体はworkoutを自動変更しない。[Readiness](https://gravl.ai/help/readiness-know-when-to-push-and-when-to-recover)

**負荷指標。** 同じreadiness画面のStrainはその日の負荷を「hardな日」に対する%とし100%を超えうる。Training loadは7日平均と28日平均の比較。これらはメーカー独自の集約/モデルであり、負傷確率や生理的疲労の直接測定として採用しない。[Readiness内のStrain/Training load説明](https://gravl.ai/help/readiness-know-when-to-push-and-when-to-recover)

**局所回復。** セット数由来の筋群別回復%、次に鍛える筋群のみの一覧、全筋群への展開、本人のスライダー補正/推定へreset、次workoutの回復が60%未満なら休息推奨ピル。全身readinessとは別物であると明記される。[筋群回復](https://gravl.ai/help/gravl-muscle-fatigue-and-recovery)

**筋群別セット。** 週の筋群ごとのring、未実施/maintenance/build/focus/above rangeゾーン、主働筋1・補助筋0.5セット、warmup除外、direct/indirect内訳、4週平均、暦週/直近7日、内訳workoutへdrill-down。初心者には粗い筋群、中上級者は三角筋の前/中/後など詳細表示。ゾーンは一般ガイドで個人の成長保証/上限ではないと公式も補足する。[Sets per Muscle](https://gravl.ai/help/sets-per-muscle-track-your-weekly-volume)

**スコアの解釈補助。** Strength Scoreの変動を新PR/新種目/3か月窓からの記録失効/再採点に分解し、各liftが総合値に何点効いたか、評価時体重、筋群内訳、次のレベルまでの点数、2週以内に失効するliftも表示。数式上は弱い種目が失効するだけで総合点が上がりうる。この透明性は数値そのもの以上に参考になる。[Strength Score](https://gravl.ai/help/gravl-strength-score-how-does-it-work)

### 6. Dr. Muscle / Dr. Muscle X

**提供中と確認できたもの。** 種目終了で前回比較/筋力履歴/新記録、全workout終了で種目/PR/streak/総量、休憩中に次セットの重量・回数とプレート増減。種目ごとのsticky noteとセットアップ写真。手動Deload/Challenge、休止後のLight/Normal、対象セッションの「Too easy/Too hard」による次回セット数変更も説明する。[2026-10-10公式更新](https://dr-muscle.com/new-dr-muscle-x-2026/)

**未提供として分離。** 同じ記事の新Home、Lift Spotlight、長期比較、週/月/四半期/半年/年間reviewは「開発中プレビュー」。現機能の一覧に混ぜない。体脂肪と除脂肪量のグラフも説明するが、除脂肪量は入力体重×体脂肪率由来で筋肉増加の直接測定でないと公式が明記する。[同記事のAvailable Now/Coming Next区分](https://dr-muscle.com/new-dr-muscle-x-2026/)

**自動deload。** 別の公式説明は推定1RMの低下に応じたdeloadとセット数低減を説明する。疲労の直接測定としては扱わない。[Building Muscle With Dr. Muscle](https://dr-muscle.com/building-muscle/)

### 7. Evolve（旧EvolveAI）

**同定。** evolveai.appは現在evolvetrainingapp.comへredirectする。血液指標を売りにする別ドメインのEVOLVE AIは今回の対象に数えなかった。

**公式機能表示。** session RPE、stress index、volume、intensity、sleep等の分析。お気に入り最大6種目の追跡、終了時のPR/achievement、DOTSと10レベル、主観チェックインに応じた変更と本人のoverride、任意のreactive deload、セット難度に応じたtimer、warmupの重量/バー組み方がある。大会で直近成績に基づく試技重量提案と全attempt記録、meet日から逆算する計画も説明される。[公式機能ページ](https://www.evolvetrainingapp.com/)

**計画と入力。** 日次の睡眠/筋肉痛/ストレス、週末・ブロック終了のperformance/recovery/fatigue。ブロックはwork capacity/hypertrophy/strength/peakingと分類し、rep範囲/RPE/RIRの違いを持つ。stress indexの数式・尺度・妥当性、readiness項目が具体的にどのグラフに表示されるかは公開ページで未確定。[個別化](https://www.evolvetrainingapp.com/post/how-does-evolve-decide-your-training)、[Block](https://www.evolvetrainingapp.com/post/what-is-a-training-block)

### 8. TrainHeroic

**主観と個人基準。** 睡眠/気分/エネルギー/ストレス/筋肉痛を各回答し、その平均をreadiness1–5として表示。点ごとのセッションコメント、長期平均、主に直近5件の重み付き平均、サブ指標の傾向矢印、本人の通常範囲を示す帯、長い傾向を示すBalanceがある。通常範囲は本人の平均/標準偏差を利用する。今日の実施可否を言い渡すより、訓練後に傾向を振り返る設計と明記。[Athlete Pro: Readiness](https://support.trainheroic.com/hc/en-us/articles/18156547276557-Athlete-Pro-Readiness)

**コーチへ伝えるもの。** セット完了、重量/回数、セッション全体の主観強度、実際の所要時間、セッション/種目コメント。チームへ共有するかコーチだけにするかがある。RX/Scaledは処方通りか修正したかの区分。[Logging your Training Session](https://support.trainheroic.com/hc/en-us/articles/18156631592589-Logging-your-Training-Session)

**遵守。** セッション単位/ブロック単位の遵守率%、チーム/全員/期間フィルター。activity feedでコメント、readiness変化、ブロックskipや種目交換を確認する運用が紹介される。遵守率から体の効果を推定してはいけない。[Compliance Analytics](https://support.trainheroic.com/hc/en-us/articles/18156702628621-Viewing-Compliance-Analytics)、[Sharing Data Insights](https://support.trainheroic.com/hc/en-us/articles/18156835338765-Sharing-Data-Insights-with-Your-Clients)

### 9. Volt

**セット内適応。** 1–10 RPEを7段階の文章ラベルにまとめ、予想したきつさと自己申告を比較して推定1RMを更新、次セットの推奨重量へ反映。目標と実績の差はアルゴリズム内に存在するが、両方の数値が画面に並ぶとはこの記事だけでは確定しない。[Smart Sets](https://help.voltathletics.com/how-do-smart-sets-work)

**コーチダッシュボード。** workout/活動の完了状態、所要時間、セット完了率、週の活動一覧、開始中/終了/skipの区分。注意すべきは丸い「completed」表示が終了とskipの両方を含みうること。ユーザーへ同じ指標を出すなら意味を明示する。[Accountability dashboard](https://help.voltathletics.com/how-do-i-track-accountability-on-my-dashboard)

**期間と回復。** Strength Numbersを基に負荷を処方し、training calendarで試合日に向けた調整をする。readinessにはsleep/soreness/energy/mood/stressがあり、要フォローの人をflagする公式紹介もある。ここでも販売文の「安全」や「怪我予防」は実証結果として転記しない。[Cortex](https://help.voltathletics.com/what-is-cortex)、[College](https://voltathletics.com/college)

### 10. MacroFactor Workouts

**目標と進行。** RIR0–6+、目標rep範囲、重量。Smart Progressionは過去と今回のperformanceから重量/回数を変える。初回の履歴がない状態ではすぐに重量を出さない。前回値で埋めるか推奨値で埋めるかを選べる。重量刻みが大きい場合はrep範囲拡張、同重量優先を設定できる。[Smart Progressions](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions)、[RIR](https://help.macrofactorapp.com/en/articles/385-what-is-rir-and-how-should-i-use-it-during-training)

**提案不能の表示。** 条件/機材が合わないとwandに黄色icon、目標範囲内で進行不能という理由、Fixで代替の重量×回数や器具設定修正などを提示。数値だけを黙って変えるより理解しやすい実例。[Smart Progressions内Warnings](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions)

**ダッシュボード。** 筋群/セット/種目の週目標ring、前cycleとの比較、recent records、外部負荷/体重/混合を分けるvolume、volumeへの寄与上位種目、習慣カレンダー、種目ごとの直近loadと小さなtrend。任意のwidget表示/順序を選べる。[Dashboard](https://help.macrofactorapp.com/en/articles/275-getting-to-know-your-workouts-dashboard)

**変更の適用範囲。** workout終了時に今回限りの構造変更か、今後のプログラムにも反映するかのtoggle。変更の種類によって今回cycle/全future instanceの効き方が違う。これとは別に、実施ログはSmart Progressionを改善する。提案採否の全履歴があるとは確認できない。[Update Program toggle](https://help.macrofactorapp.com/en/articles/395-what-does-the-update-program-toggle-do)

## 補助比較で埋まった表示の穴

### Alpha Progression

セットごとの重量/回数/任意RIR目標、過去と今回完了セットを使った次セット調整、available weightの刻みを反映。初回は履歴がなく推奨なし、deloadなら専用の軽い推奨。推奨は編集可能で保証された予測ではない、可動域/マシン/補助/痛みなどが比較を変える、と公式が明記する。既存の「次回推奨」系を補強するが、新しい生理指標ではない。[Progression recommendations](https://alphaprogression.com/en/glossary/progression-recommendations)

### Liftosaur

公式changelogから、目標RPEを灰色、実績RPEを橙色で表示（2023-08-04）。progressによる変更内容の隣のSuppressで今回の自動進行を抑止（2025-06-13）。programを保存するたびに版を残し、最大100スナップショットを復元（2024-08-03）。Liftoscriptのprintで「全rep達成したので5lb追加」等の説明も作れる（2026-10-28）。ただし自動提案の採用/拒否の完全監査ログと版履歴は同じではない。[開発元CHANGELOG](https://github.com/astashov/liftosaur/blob/master/CHANGELOG.md)

### Everfit

種目ごとの文章/画像/フォーム動画コメントを、workout内で種目tag付きの統合threadとして表示。終了後のworkout rating/追加コメントをコーチがweb/mobileで見られる。2026更新では種目の過去コメントを横断して見返せ、フォームcue・痛みflag・progression noteを引き継ぐ。ratingは努力/難度の自己申告で、楽しさとは確認できない。[Comments](https://help.everfit.io/en/articles/4346734-comments-for-completed-workouts)、[Tracking](https://help.everfit.io/en/articles/5829094-client-app-track-a-workout)、[2026更新](https://blog.everfit.io/everfit-may-2026-new-features)

### ABC Trainerize

予定されたworkout/cardioを何%完了したかで週のcomplianceを算出。本人が追加した活動は分子/分母に入らず、低/高の閾値tagでclientをfilterする。予定と実績を併記しない単純な「100%」では実際の活動量を誤読する例。[Compliance tags](https://help.trainerize.com/hc/en-us/articles/360001219886-How-to-Measure-Workout-and-Nutrition-Compliance-with-Auto-Client-Tags)

### TrueCoach

clientごとの7/30/90日のcomplianceを説明し、割り当てた種目に対する完了種目割合で計算する。dashboardには当日workout/コメント/計画終了間近/要フォローがあり、未実施やcompliance低下などを早く見つける用途。セッション単位の遵守%とは分母が違う。[公式トップ](https://truecoach.co/)、[Coach Dashboard](https://truecoach.co/features/dashboard/)

## 表示案の台帳（重複を整理した候補）

以下は競合観察から得た設計候補。行ごとの単位・期間・条件の違いを別の生理指標として数えない。`確認`は少なくとも一社の公式説明に存在、`案`は今回の独自提案で実装済みと混同しない。

| ID | 1行の表示案 | 状態・根拠 | ユーザーができる判断 |
|---|---|---|---|
| C01 | 今日の重量×rep範囲×セット数×目標余力を1行で表示 | 確認：MacroFactor/Boostcamp等 | 何を目指すか |
| C02 | 同じ行で処方したRPE/RIRと実際のRPE/RIRを区別 | 確認：Liftosaur | 予定よりきつかったか |
| C03 | RPE/RIR数値に「あと2回できる」等の言葉を添える | 確認：Boostcamp | 初めてでも入力可能 |
| C04 | 次セットの重量・回数を休憩中に表示 | 確認：Dr. Muscle等 | 器具を準備する |
| C05 | 次回提案に増量/同重量/減量と変更量を付ける | 確認：Boostcamp | 次に狙うこと |
| C06 | 「全セット上限rep達成」等の短い変更理由を表示 | 確認：Boostcamp/Gravl | 推奨を理解する |
| C07 | 提案の理由を前回実績・余力・種目順へ展開 | 確認：Gravl | 条件が変わったか |
| C08 | 提案の全セット別の分析へ掘れるようにする | 確認：Gravl | どのセットが影響したか |
| C09 | 使える重量刻みに合わない場合、同重量rep増案を示す | 確認：MacroFactor/Alpha | 実行できる進歩を選ぶ |
| C10 | 目標範囲内の提案不能を明示し代替組合せを表示 | 確認：MacroFactor | 不可能な指示を避ける |
| C11 | 初回/履歴不足による提案待ちを数値ゼロと区別 | 確認：MacroFactor/Alpha | まず記録する必要を理解 |
| C12 | 推奨値で入力欄を埋めたか前回値かを表示 | 確認：MacroFactor設定 | 実測値と予定値を混同しない |
| C13 | 今日のプログラム変更が今回限りか将来にも残るか表示 | 確認：MacroFactor | 一時代替を固定化しない |
| C14 | 今回は進行ルールを適用しない状態を表示 | 確認：Liftosaur Suppress | 不調/意図的な軽練習を扱う |
| C15 | プログラムの版と過去版からの復元を表示 | 確認：Liftosaur | 変更を戻す |
| C16 | 提案→手動修正→採用/拒否→理由の履歴を残す | 案：完全な履歴は未確認 | 自分に合わない提案を発見 |
| C17 | 推奨の根拠件数・最終記録日・機材一致状況を表示 | 案：信頼区間は未確認 | どれくらい信用するか |
| C18 | 推奨にモデル更新前後や推定方法を付ける | 案 | 同じ数値の意味の変化を把握 |
| C19 | 前回よりきつい/同じ/楽という主観を残す | 確認：Dr. Muscle/各RIR | 重量以外の変化を見る |
| C20 | パンプの自己評価を種目/筋群に結び付ける | 確認：RP | 刺激の体感を伝える |
| C21 | 次に鍛える時点の筋肉痛を残す | 確認：RPのフィードバック | 前回量を振り返る |
| C22 | 「セット量がきつい」という主観を余力と分ける | 確認：RP | 重量と総量の問題を分ける |
| C23 | 関節痛評価を再表示し前回回答を残す | 確認：RP release | 変化を伝える |
| C24 | 痛み/不快感/筋肉痛の位置と発生タイミングを別欄にする | 案：この一式は未確認 | 状況を説明する |
| C25 | 種目の好き/苦手/またやりたいを難度と分ける | 案＋公式要望あり | 続けられる内容を選ぶ |
| C26 | セッション全体の主観強度をセット余力と分ける | 確認：TrainHeroic/Evolve | 全体の疲れを伝える |
| C27 | 睡眠の主観/気分/活力/ストレス/筋肉痛を別々に記録 | 確認：TrainHeroic/Juggernaut | 何が変わったかを知る |
| C28 | 主観readinessの長期平均と最近の平均を並べる | 確認：TrainHeroic | 普段からの変化を知る |
| C29 | 本人の通常範囲を帯で表示 | 確認：TrainHeroic | 他人の平均に引かれない |
| C30 | 下位項目ごとの上向き/下向き矢印を表示 | 確認：TrainHeroic | 合計点に埋もれる問題を発見 |
| C31 | 長めに続く偏りと短期の変動を分ける | 確認：TrainHeroic Balance | 単日の上下を過大評価しない |
| C32 | センサー由来の全身readinessと手入力を区別 | 確認：Gravl/TrainHeroicで別方式 | 数値の由来を知る |
| C33 | readinessに各要素が加減した点数を付ける | 確認：Gravl | 点数低下の理由を知る |
| C34 | 校正中/前夜データ待ち/睡眠なしを明示 | 確認：Gravl | 低い値と欠測を区別 |
| C35 | workout後は次の日に向けた回復情報へ切り替える | 確認：Gravl | いま取れる行動を知る |
| C36 | 全身readinessと筋群別の回復推定を別表示 | 確認：Gravl | 強度と部位の判断を分ける |
| C37 | 筋群別回復推定を身体図で表示 | 確認：Fitbod/Gravl | どの部位を鍛えるか |
| C38 | 次workoutで使う筋群だけを抽出する | 確認：Gravl | 今日に関係する値を見る |
| C39 | 回復推定の本人による補正とreset状態を表示 | 確認：Fitbod/Gravl | 体感とのずれを訂正 |
| C40 | 外部取込のrun等が回復推定へ影響したと表示 | 確認：Fitbod/Gravl | 脚の値が変わった理由を知る |
| C41 | 回復推定の元になった運動と経過を開ける | 確認：Fitbod筋群履歴 | 表示を検証する |
| C42 | 日次strainと短期/長期loadを区別する | 確認：Gravl | 今日と蓄積の違いを見る |
| C43 | セッション前の値を実施可否の命令にせず、事後の傾向として出す選択肢 | 確認：TrainHeroic | 数値を気にしすぎず振り返る |
| C44 | underperformance flagと負荷を緩める選択肢 | 確認：RP | 無理に前回を超えない |
| C45 | Normal/Light/Deload/Challengeのセッション目的を表示 | 確認：Dr. Muscle | 今日の低負荷を後退と誤読しない |
| C46 | 休止からの復帰セッションを通常と分ける | 確認：Dr. Muscle | 前歴と比較する条件を知る |
| C47 | 週の筋群/セット/種目目標と実績ring | 確認：MacroFactor | 今週残っていることを知る |
| C48 | 筋群別direct/indirectセットを分ける | 確認：Gravl | 複合種目の重複を理解 |
| C49 | 週と直近7日を切り替える | 確認：Gravl | 週境界の見かけのゼロを避ける |
| C50 | 4週平均と今週を比べる | 確認：Gravl | 一時的な変動を判断 |
| C51 | 一般的なセット範囲と個人目標を区別 | 確認：Gravl一般ゾーン | 範囲外を危険判定と誤読しない |
| C52 | 初心者は大きい筋群、詳細は部位分割に展開 | 確認：Gravl | 情報量を調整する |
| C53 | 外部重量/自重/混合のvolumeを区別 | 確認：MacroFactor | メニュー変更による数字の上下を理解 |
| C54 | volume変化の寄与が大きい種目を示す | 確認：MacroFactor | 何を増減したか知る |
| C55 | ブロックの目的・現在週・残り週・deload予定 | 確認：Juggernaut/RP/Evolve | 今日の位置を理解 |
| C56 | 過去と今後を一枚のブロック表で見られる | 確認：Juggernaut | 次週へ続く見通しを持つ |
| C57 | 日次/週末/ブロック末の回答を区別 | 確認：Juggernaut/Evolve | 判断の時間軸をそろえる |
| C58 | 大会/テスト日までの期間とpeaking/taperの計画 | 確認：Evolve/Volt | 今追うべき目標を知る |
| C59 | 大会の試技候補重量と直近実績由来の理由 | 確認：Evolve（理由の詳細表示は未確定） | 次のattemptを選ぶ |
| C60 | 予定/開始中/完了/skipを明確に分ける | 確認：RP/Volt | 記録の意味を理解 |
| C61 | 終了・skipを一緒にした指標は分子の定義を表示 | 案：Voltで混在を観察 | 成功率を誤読しない |
| C62 | セッション遵守率とブロック遵守率を分ける | 確認：TrainHeroic | どこまで実施したか知る |
| C63 | 予定の分母と実施した分子を添える | 案：Trainerize/TrueCoach定義差から | 100%の意味を知る |
| C64 | 自主追加workoutを予定遵守と活動量から区別 | 確認：Trainerizeで算入外 | 頑張りが見えなくなるのを防ぐ |
| C65 | 実時間と開始/終了の訂正を示す | 確認：TrainHeroic/Everfit | 放置時間を実運動時間と誤認しない |
| C66 | 所要時間・セット完了率をコーチが一覧で見る | 確認：Volt | 状況を把握する |
| C67 | 処方通り/RXと修正/Scaledを区別 | 確認：TrainHeroic | 比較条件をそろえる |
| C68 | 種目tag付きコメントを統合threadに表示 | 確認：Everfit | 文脈を探さず伝える |
| C69 | 文章・画像・フォーム動画を同じ種目へ結び付ける | 確認：Everfit | 数字にできない情報を伝える |
| C70 | 過去のフォームcue・痛みflag・進行メモを種目横断履歴で表示 | 確認：Everfit更新 | 同じ問題を繰り返さない |
| C71 | 機材の座面位置/設定と写真を次回に残す | 確認：Dr. Muscle | 再現条件をそろえる |
| C72 | 要フォロー/未実施増加/計画終了間近をコーチに通知 | 確認：TrueCoach | 支援のタイミングを知る |
| C73 | チーム共有かコーチのみかの範囲を表示 | 確認：TrainHeroic | 誰に見えるか選ぶ |
| C74 | 満足度/楽しさ/自信を難度とは別の任意項目にする | 案：Trainerize公式要望 | 継続上の問題を見つける |
| C75 | skip/変更理由を「痛み・機材待ち・時間・気分」から任意で記録 | 案：専用分類の実在は未確認 | 未達の原因を次回へつなぐ |
| C76 | 独自スコアの新記録/新種目/失効/再採点を分解 | 確認：Gravl | スコア上昇を身体変化と混同しない |
| C77 | スコアの評価時体重と対象種目を開示 | 確認：Gravl | 条件の違いを理解 |
| C78 | スコア算入記録の期限と次に消えるliftを表示 | 確認：Gravl | 点数変化を予測できる |
| C79 | 次レベルまでの差分を表示 | 確認：Gravl | 小さな目標を作る |
| C80 | 数値の上下を短文で説明し元ログへ戻れる | 確認：Gravl AI summary/内訳 | 要約を検証する |

## 需要の証拠、未確認、科学上の境界

**確認できた要望は少数例。** ABC Trainerizeの公式Idea Forumには、種目/スーパーセットごとのdifficulty ratingを求める提案に28票。コメントには、難度とは別に好き嫌い/楽しさ/痛みを伝えたいという声がある。自己選択された少人数の要望で、全利用者の優先順位・有料転換・継続改善の証拠ではない。現実装として数えない。[公式要望ページ](https://ideas.abcfitness.com/forums/940789-client-gym-members-abc-trainerize/suggestions/43800618-allow-ratings-for-specific-exercises)

**未確認。** この範囲では、全自動提案の採用/拒否/修正を時系列で監査する専用画面、重量提案の統計的信頼区間、推定1RMの誤差帯、個人別に検証された怪我確率、「何g筋肉が増えたか」の訓練ログからの直接測定は確認できなかった。未確認は市場に存在しないという証明ではない。

**数値の種類。** 重量/回数/実施日時はログされた観測。RIR/RPE/痛み/筋肉痛/睡眠の体感は自己申告。1RM/回復%/readiness/strain/stress index/MEV/MRV/strength scoreは計算または独自推定。HRVなどはセンサー由来の推定/計測で、筋肉そのものの回復とは別。メーカーの「怪我防止」「最適」「科学的」という表現は本ノートでは効果の確証へ変換していない。

**比べる条件。** 機械のブランド/場所、可動域、tempo、補助、種目順、片側か両側か、スーパーセット、休憩、deload、技術的失敗の基準が違うと、同じ重量×回数/RIRでも単純比較できない。ここから「条件が一致する過去の結果」と「違う条件の結果」を識別する表示は有力な案だが、その一式を競合が提供済みと断定しない。

## 探索の巡回と新規性

1. **第1巡：10社の公式機能・ヘルプを横断。** 主観余力、部位別回復、readiness、週目標、PR/volume、block、deload、次回負荷を抽出。これだけでは一般的なログ分析の範囲。
2. **第2巡：同じ10社の深いヘルプ/最新リリースへ。** TrainHeroicの個人基準帯とBalance、Gravlの「Why this weight?」・要因別readiness点数・欠測状態・スコア変動原因、MacroFactorの推奨不能/代替解、Dr. Muscleの提供中とpreview区分を追加。新しい「解釈/信頼の補助」という系統が増えた。
3. **第3巡：コーチへ見せる情報と意思決定履歴の穴を狙う。** Everfit/Trainerize/TrueCoachを追加。コメントの種目tag/画像/動画/履歴、遵守率の分母差、計画終了/要フォロー、Liftosaurの進行抑止と版履歴、MacroFactorの変更適用範囲を追加。
4. **終盤の追加探索A：Alpha Progression、Liftosaurのprogression/deloadを確認。** 目標RPEと実績の同時表示、機材刻み、初回履歴不足、手動抑止を補強。新しい身体データ系統は増えなかった。
5. **終盤の追加探索B：10社のskip理由/accept/change history、コーチfeedback/楽しさを再検索。** 既存の変更適用範囲とコメント/主観の系統を補強し、楽しさの要望を発見。新しい計測系統は増えず、完全な採否履歴/信頼区間は未確認として残した。

この担当範囲では、最後の2つの狙った探索で新しい計測系統が増えなかったという局所的な飽和まで探索した。「世界の全サービスを尽くし、新たな表示が絶対にない」という結論ではない。
