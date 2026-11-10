# 筋トレのデータ表示・統合カタログ

確認日: 2026-11-10。324件の観察/案を270の表示テーマへ統合。16分野。主指標、比較条件、状態表示、提示する時点を含む。項目数は独立した生理指標の数ではない。

P0=既存ログで着手、P1=任意入力/計画保存の土台、P2=対象者別の拡張、P3=計測/外部基準の専門機能。優先度はFitSwipe向け設計判断で、需要/効果の実証順位ではない。

観察=公式資料の説明。観察＋整理/案=保存された資料の要約または設計案を含む。各候補のvariantsで実装確認と案を区別。資料の取得方法・バージョン差は原ノート参照。

完全なテーマの実現に必要なデータを保守的に分類。簡単な変種は少ない入力で実現できる。現在実装済みという意味ではない。

元の観察はcatalog.jsonのvariantsに全324件を保存。T=trackers.mdのC行、A=coaching.mdのC行、D=devices.mdの一覧の上からの順番、J=context-and-japan.mdの番号、X=additional-exploration.mdのX行。

## セット前・次の行動

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T01 | **各セット行に前回の重量×回数と日付**<br>今回の入力と比較すべき出発点 | 記録：同種目・同じ左右・セット位置を優先。日付も併記し、未記録の機材/ROM/休憩まで同条件とは断定しない。 | P0 | 観察<br>[Previous Workout Values](https://www.hevyapp.com/features/track-exercises/) / [Liftosaur Workout](https://api3.liftosaur.com/features/workout-screen)<br>観察: T01 |
| T02 | **同種目・ルーチン・機材・期間で比較条件を絞る**<br>種目順や疲労条件が近い比較か | 追加：同プリセットID/種目/左右/期間は既存記録から絞れる。ジム/機材ID・条件タグ・過去の実施順は追加保存が必要。 | P2 | 観察＋整理/案<br>[Previous Workout Values](https://www.hevyapp.com/features/track-exercises/) / [Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: T02, D81, J02 |
| T03 | **多週プログラムの同じ日・同じセット位置の履歴**<br>週をまたぐ同条件での進行 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftosaur Workout](https://api3.liftosaur.com/features/workout-screen)<br>観察: T03 |
| T04 | **現在のセットに対応した過去ベスト/Best AMRAP**<br>どこまで達成すれば記録か | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Liftosaur Workout](https://api3.liftosaur.com/features/workout-screen)<br>観察: T04 |
| T05 | **目標の重量・回数・セット・余力と実績を区別する**<br>計画通りか、予定以上に追い込んだか | 追加：処方重量/回数/セット/余力と実績を別保存。当初の計画と変更版を固定し、後から現プリセットを参照して復元しない。 | P1 | 観察<br>[Alpha Complete Guide](https://alphaprogression.com/en/blog/alpha-progression-guide) / [GymBook FAQ](https://gymbookapp.com/faq) / [Smart Progressions](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions)<br>観察: T05, A01, A02 |
| T06 | **同じ重量における平均回数と回数PR**<br>重量を上げなくても「いつもより良い」か | 記録：同種目・左右・重量で回数を比較。重量刻み、無負荷、過去の条件未記録を区別。 | P0 | 観察<br>[StrengthLog Logging](https://help.strengthlog.com/help-article/how-to-record-a-workout/)<br>観察: T06 |
| T07 | **セットごとのe1RM/e10RM/量を選択表示**<br>重量と回数が異なるセットの目安比較 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Alpha Complete Guide](https://alphaprogression.com/en/blog/alpha-progression-guide)<br>観察: T07 |
| T08 | **その重量が自己1RMの何%か**<br>今日のセットの相対強度 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[StrengthLog Logging](https://help.strengthlog.com/help-article/how-to-record-a-workout/)<br>観察: T08 |
| T09 | **セット重量が自分の体重の何倍か**<br>体格に対する荷重の大きさ | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[StrengthLog Logging](https://help.strengthlog.com/help-article/how-to-record-a-workout/)<br>観察: T09 |
| T10 | **自己maxを基準としたSTRAINのゾーン**<br>次セットが軽い/重い領域か | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Gravitus](https://gravitus.com/)<br>観察: T10 |
| T11 | **PRを超えるのに必要な回数**<br>次セットの具体的な挑戦目標 | 記録：実測の同重量PRがあれば「あと1回」。別重量からの必要回数は推定と明記し、対象回数上限を設ける。 | P0 | 観察<br>[Gravitus](https://gravitus.com/)<br>観察: T11 |
| T12 | **直近実績から次セットの重量・回数を示す**<br>疲労や予想外の好不調への調整 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Alpha Recommendations](https://alphaprogression.com/en/blog/alpha-progression-progression-recommendations) / [Alpha Progression glossary](https://alphaprogression.com/en/glossary/progression-recommendations) / [Smart Progressions](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions)<br>観察: T12, A04 |
| T13 | **重量刻みに合わせ、同重量で回数を増やす案も示す**<br>増量が大き過ぎるなら先に回数を増やすか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Alpha Recommendations](https://alphaprogression.com/en/blog/alpha-progression-progression-recommendations) / [Alpha Progression glossary](https://alphaprogression.com/en/glossary/progression-recommendations) / [Smart Progressions](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions)<br>観察: T13, A09 |
| T14 | **理論目標重量→実際に組める重量と丸め理由**<br>なぜ計画値と表示重量が違うか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftosaur Workout](https://api3.liftosaur.com/features/workout-screen)<br>観察: T14 |
| T15 | **左右それぞれのプレート構成**<br>今から何を装着するか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftin’](https://liftinapp.co/) / [Liftosaur Workout](https://api3.liftosaur.com/features/workout-screen)<br>観察: T15 |
| T16 | **ウォームアップの段階別重量×回数**<br>作業セットまでどう準備するか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftin’](https://liftinapp.co/) / [Alpha Complete Guide](https://alphaprogression.com/en/blog/alpha-progression-guide)<br>観察: T16 |
| T17 | **前回/固定メモ・機材設定と写真を種目に結び付ける**<br>マシン座席やフォーム条件を再現できるか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察＋整理/案<br>[Alpha Complete Guide](https://alphaprogression.com/en/blog/alpha-progression-guide) / [RepCount Features](https://www.repcountapp.com/features) / [推奨重量](https://gravl.ai/help/gravl-science-understand-your-recommended-weights)<br>観察: T17, A71, J09 |
| T18 | **種目共通、特定ルーチン内、今回セットのメモを区別**<br>恒常条件と当日の出来事の区別 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[GymBook FAQ](https://gymbookapp.com/faq) / [StrengthLog Logging](https://help.strengthlog.com/help-article/how-to-record-a-workout/)<br>観察: T18 |
| T22 | **目的に合わせ、運動中に追う主指標を選ぶ**<br>自分の目的の指標をトレ中に追える | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察＋整理/案<br>[Focus Metric](https://help.strongapp.io/article/226-focus-metric) / [Personalized Weekly Targets](https://knowledge.tonal.com/kb/guide/en/how-to-use-personalized-weekly-targets-IcOTXeWcYl/Steps/4353081)<br>観察: T22, X29 |
| T23 | **ロック画面/通知に今の種目・セット・推奨・休憩**<br>端末を開かず次の行動を理解 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Alpha Complete Guide](https://alphaprogression.com/en/blog/alpha-progression-guide) / [Liftin’](https://liftinapp.co/)<br>観察: T23 |
| A03 | **セットRIR/RPEとセッション全体の主観強度を尺度付きで示す**<br>初めてでも入力可能 | 追加：セットRIR/RPE、全体RPE、質問時点と尺度を保存。目標RIRと回答値、未回答を分離する。 | P1 | 観察<br>[Smart Progressions](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions) / [RIR](https://help.macrofactorapp.com/en/articles/385-what-is-rir-and-how-should-i-use-it-during-training) / [2026-10-10公式更新](https://dr-muscle.com/new-dr-muscle-x-2026/)<br>観察: A03, A19, A26, D62 |
| J01 | **重量を変えたときの「PR更新に必要な回数」。実測の同重量PRと、e1RMからの推定必要回数を区別する。**<br>条件・目標・由来を含めて記録を解釈する | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察＋整理/案<br>[REPLOG 開発者のストア説明](https://apps.apple.com/jp/app/id6792484714)<br>観察: J01 |

## 計画・進行・変更理由

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T74 | **作る前の週プログラムの部位量・日数**<br>実施前に偏りを修正 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftosaur Web Editor](https://www.liftosaur.com/features/web-editor)<br>観察: T74 |
| T75 | **計画の週ごと量・強度の推移**<br>ピークや軽い週を含めた周期構成 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftosaur Web Editor](https://www.liftosaur.com/features/web-editor)<br>観察: T75 |
| T92 | **復帰カードに推奨減量率と再開する具体重量**<br>久しぶりの運動の再開地点 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[StrongLifts Progression](https://support.stronglifts.com/article/71-progression)<br>観察: T92 |
| T93 | **成功/失敗の仮入力後、次回重量や回数をシミュレーション**<br>自動進行ルールを採用前に理解 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftosaur Playground](https://www.liftosaur.com/features/playground)<br>観察: T93 |
| A05 | **次回提案に増量/同重量/減量と変更量を付ける**<br>次に狙うこと | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Auto Progression](https://www.boostcamp.app/features/auto-progression)<br>観察: A05 |
| A06 | **「全セット上限rep達成」等の短い変更理由を表示**<br>推奨を理解する | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Auto Progression](https://www.boostcamp.app/features/auto-progression)<br>観察: A06 |
| A07 | **提案理由を前回・余力・種目順・セット別分析へ展開する**<br>条件が変わったか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[推奨重量](https://gravl.ai/help/gravl-science-understand-your-recommended-weights)<br>観察: A07, A08 |
| A10 | **目標範囲内の提案不能を明示し代替組合せを表示**<br>不可能な指示を避ける | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Smart Progressions](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions) / [RIR](https://help.macrofactorapp.com/en/articles/385-what-is-rir-and-how-should-i-use-it-during-training)<br>観察: A10 |
| A12 | **推奨値で入力欄を埋めたか前回値かを表示**<br>実測値と予定値を混同しない | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Smart Progressions](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions) / [RIR](https://help.macrofactorapp.com/en/articles/385-what-is-rir-and-how-should-i-use-it-during-training)<br>観察: A12 |
| A13 | **今日のプログラム変更が今回限りか将来にも残るか表示**<br>一時代替を固定化しない | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Update Program toggle](https://help.macrofactorapp.com/en/articles/395-what-does-the-update-program-toggle-do)<br>観察: A13 |
| A14 | **今回は進行ルールを適用しない状態を表示**<br>不調/意図的な軽練習を扱う | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[開発元CHANGELOG](https://github.com/astashov/liftosaur/blob/master/CHANGELOG.md)<br>観察: A14 |
| A15 | **プログラムの版と過去版からの復元を表示**<br>変更を戻す | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[開発元CHANGELOG](https://github.com/astashov/liftosaur/blob/master/CHANGELOG.md)<br>観察: A15 |
| A16 | **提案→手動修正→採用/拒否→理由の履歴を残す**<br>自分に合わない提案を発見 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 設計案<br>原ノートの仮説・観察を参照<br>観察: A16 |
| A17 | **推定の根拠件数・条件一致・ばらつきを説明する**<br>どれくらい信用するか | 追加：根拠件数/最終日自体は履歴から取得可能。機材一致・推定手法・信頼性には条件記録と検証が必要。 | P1 | 設計案<br>[推奨重量](https://gravl.ai/help/gravl-science-understand-your-recommended-weights)<br>観察: A17, X30 |
| A18 | **推奨にモデル更新前後や推定方法を付ける**<br>同じ数値の意味の変化を把握 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 設計案<br>原ノートの仮説・観察を参照<br>観察: A18 |
| A44 | **underperformance flagと負荷を緩める選択肢**<br>無理に前回を超えない | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[低パフォーマンスflag](https://hypertrophy.zendesk.com/hc/en-us/articles/13516219395735-If-I-get-a-flag-for-underperformance-what-do-I-do)<br>観察: A44 |
| A45 | **通常・軽め・deload・挑戦・復帰などセッションの目的を示す**<br>今日の低負荷を後退と誤読しない | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[2026-10-10公式更新](https://dr-muscle.com/new-dr-muscle-x-2026/)<br>観察: A45, A46 |
| A55 | **ブロックの目的・現在週・残り週・deload予定**<br>今日の位置を理解 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[v3.0公式リリース](https://www.juggernautai.app/blog/juggernautai-v3-0-is-here)<br>観察: A55 |
| A56 | **過去と今後を一枚のブロック表で見られる**<br>次週へ続く見通しを持つ | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[v3.0公式リリース](https://www.juggernautai.app/blog/juggernautai-v3-0-is-here)<br>観察: A56 |
| A57 | **日次/週末/ブロック末の回答を区別**<br>判断の時間軸をそろえる | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[個別化の仕組み](https://help.jtsstrength.com/en/articles/3-how-juggernautai-is-individualized-to-you)<br>観察: A57 |
| A58 | **大会/テスト日までの期間とpeaking/taperの計画**<br>今追うべき目標を知る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[公式機能ページ](https://www.evolvetrainingapp.com/)<br>観察: A58 |
| A59 | **大会の試技候補重量と直近実績由来の理由**<br>次のattemptを選ぶ | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[公式機能ページ](https://www.evolvetrainingapp.com/)<br>観察: A59 |

## PR・筋力・相対比較

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T24 | **最重量・e1RM・1セット量・1回の種目合計量を別PRに**<br>何が改善した記録なのか | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Set Records vs Personal Records](https://help.hevyapp.com/hc/en-us/articles/38279531346455-Set-Records-vs-Personal-Records)<br>観察: T24 |
| T25 | **規定回数ごとの実測最大重量を示す**<br>自分が鍛えている回数帯の進歩 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察<br>[Set Records vs Personal Records](https://help.hevyapp.com/hc/en-us/articles/38279531346455-Set-Records-vs-Personal-Records) / [Exercise Detail](https://help.strongapp.io/article/237-about-exercise-detail) / [A New Era for Tempo](https://tempo.fit/blog/a-new-era-for-tempo)<br>観察: T25, D01 |
| T26 | **実測RM表と式による予測RM表を切替**<br>実際に挙げたものと推測の分離 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[FitNotes Progress Tracking](https://www.fitnotesapp.com/progress_tracking/)<br>観察: T26 |
| T27 | **高回数で達成した重量が低回数RMも満たす場合を淡く表示**<br>実測その回数の記録か、上位記録からの包含か | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[FitNotes Progress Tracking](https://www.fitnotesapp.com/progress_tracking/)<br>観察: T27 |
| T28 | **PRに元セットと達成日を付け、元ワークアウトへ移動**<br>数値の根拠と当日の条件 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察<br>[Gym Progress](https://www.hevyapp.com/features/gym-progress/) / [Liftosaur Graphs](https://www.liftosaur.com/features/graphs)<br>観察: T28 |
| T29 | **現在PRだけでなく、同回数PRの更新履歴**<br>停滞期間や改善の階段 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[FitNotes iOS Records](https://www.getfitnotes.com/docs/records.html) / [HeavySet](https://heavyset.app/)<br>観察: T29 |
| T30 | **全期間PR、今年PR、任意期間PRを別に保持**<br>復帰期や周期内での成功 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察<br>[RepCount Premium](https://support.repcountapp.com/article/50-what-is-included-in-repcount-premium) / [FitNotes iOS Records](https://www.getfitnotes.com/docs/records.html)<br>観察: T30 |
| T31 | **同じセットが期間PRかつ全期間PRであることを色で表示**<br>小さな成功と生涯最高の関係 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[FitNotes iOS Records](https://www.getfitnotes.com/docs/records.html)<br>観察: T31 |
| T32 | **種目全期間top5セットと最近のセット**<br>最高一発だけに依存しない実力把握 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Daptis Progress](https://www.daptis.app/features/progressive-overload-tracking)<br>観察: T32 |
| T33 | **今回の改善・全期間PR・目標達成を区別して振り返る**<br>運動中の達成感と後の振り返り | 追加：前回比やPRは既存ログで表示可。個人目標の達成まで一緒に扱うなら、目標値・期間・当時の定義を追加保存する。 | P1 | 観察＋整理/案<br>[Set Records vs Personal Records](https://help.hevyapp.com/hc/en-us/articles/38279531346455-Set-Records-vs-Personal-Records) / [JEFIT FAQ](https://www.jefit.com/support/faq) / [REPLOG 開発者のストア説明](https://apps.apple.com/jp/app/id6792484714)<br>観察: T33, J23 |
| T34 | **初回は基準記録として扱い、更新PR扱いしない**<br>初回祝いと本当の改善の区別 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察<br>[Daptis Progress](https://www.daptis.app/features/progressive-overload-tracking)<br>観察: T34 |
| T35 | **種目に合う回数・保持秒数・技能段階の実績を示す**<br>運動に合った達成基準 | 追加：自重反復は既存記録。保持秒数・技能段階・補助量/加重の構造化は追加。0kgから身体の実効負荷は分からない。 | P1 | 観察＋整理/案<br>[Set Records vs Personal Records](https://help.hevyapp.com/hc/en-us/articles/38279531346455-Set-Records-vs-Personal-Records) / [Bodyweight vs Assisted vs Weighted](https://help.hevyapp.com/hc/en-us/articles/44098622782487-Bodyweight-Exercises-in-Hevy-Bodyweight-vs-Assisted-vs-Weighted) / [Calistree / Skill trees](https://calistree.app/knowledge?id=skillTrees)<br>観察: T35, J10 |
| T36 | **推定1RM計算の元セット・式・対象回数上限**<br>指標の信頼できる範囲 | 記録：現行式は1回を実測値、2〜10回をweight×(1+reps/30)、11回以上は対象外。RIR・ROMの補正は現状なし。 | P2 | 観察<br>[FitNotes Progress Tracking](https://www.fitnotesapp.com/progress_tracking/) / [StrongLifts Graphs](https://support.stronglifts.com/article/89-graphs)<br>観察: T36 |
| T37 | **実際の挙上重量と推定最大重量の推移を区別する**<br>予測値上昇と本当の使用重量上昇の差 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Liftosaur Graphs](https://www.liftosaur.com/features/graphs) / [Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: T37, D02 |
| T38 | **Training Maxの履歴を通常1RMと分ける**<br>計画基準を保守的にした変更か、実力変化か | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftin’旧公式紹介](https://liftin-workout-app.squarespace.com/) / [FitNotes iOS Charts](https://www.getfitnotes.com/docs/stats-graphs-and-charts.html)<br>観察: T38 |
| T39 | **Squat+Bench+DeadliftのTotal**<br>主要3種目を合わせた進歩 | 記録：既存logic.tsに名称を正規化して3種目の全期間最大e1RMを合算する実装がある。現行ホームに表示する専用UIは確認できない。競技日の実測Totalとは別。 | P2 | 観察<br>[StrongLifts Graphs](https://support.stronglifts.com/article/89-graphs)<br>観察: T39 |
| T40 | **比較集団の条件を明示した筋力レベル・パーセンタイル**<br>似た条件の利用者の中での位置 | 外部基準：同条件の比較集団と出典・期間・標本数が必要。手入力実績から相対位置を出すことは可能だが、Tonal等の独自順位をそのまま再現はできない。 | P3 | 観察＋整理/案<br>[Gym Progress](https://www.hevyapp.com/features/gym-progress/) / [Gravitus](https://gravitus.com/) / [Gravitus Pro](https://gravitus.com/pro/)<br>観察: T40, T41, D04, J19 |
| T42 | **e1RM÷体重の経時推移**<br>増量/減量中の相対筋力の変化 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[RepCount Chart Guide](https://support.repcountapp.com/article/35-how-do-i-make-the-most-out-of-the-charts)<br>観察: T42 |
| T96 | **範囲PRと本当に表彰対象のPRの区別**<br>通知が出ない理由を理解 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Set Records vs Personal Records](https://help.hevyapp.com/hc/en-us/articles/38279531346455-Set-Records-vs-Personal-Records)<br>観察: T96 |
| A76 | **独自スコアの新記録/新種目/失効/再採点を分解**<br>スコア上昇を身体変化と混同しない | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Strength Score](https://gravl.ai/help/gravl-strength-score-how-does-it-work)<br>観察: A76 |
| A77 | **スコア/体重比の対象種目・分母体重・測定日を示す**<br>条件の違いを理解 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[Strength Score](https://gravl.ai/help/gravl-strength-score-how-does-it-work)<br>観察: A77, X32 |
| A78 | **スコア算入記録の期限と次に消えるliftを表示**<br>点数変化を予測できる | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Strength Score](https://gravl.ai/help/gravl-strength-score-how-does-it-work)<br>観察: A78 |
| A79 | **次レベルまでの差分を表示**<br>小さな目標を作る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Strength Score](https://gravl.ai/help/gravl-strength-score-how-does-it-work)<br>観察: A79 |
| A80 | **数値の上下を短文で説明し元ログへ戻れる**<br>要約を検証する | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Strength Score](https://gravl.ai/help/gravl-strength-score-how-does-it-work)<br>観察: A80 |
| D03 | **筋力：全身/上半身/下半身/体幹/筋群のスコア**<br>独自尺度、対象運動の偏り | 外部基準：Tonal等の独自スコアは同社定義/計測に依存。同名スコアを公開説明だけで再現できるとは限らない。 | P3 | 観察<br>[Strength Score](https://knowledge.tonal.com/kb/guide/en/strength-score-wTNfx9Xu5q/Steps/4184309)<br>観察: D03 |
| D05 | **筋力：%1RM、使用重量が能力に対してどの位置か**<br>e1RMなら推定と表示 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D05 |
| J08 | **トップセットと、全セットをまとめた結果の並置。**<br>条件・目標・由来を含めて記録を解釈する | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察＋整理/案<br>[Last Rep Pro / 公式](https://last-rep-pro.web.app/)<br>観察: J08 |

## 時系列・比較・停滞

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T43 | **8回など回数を固定した各回の最重量の線**<br>同じ回数で実際に増量したか | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察<br>[FitNotes Progress Tracking](https://www.fitnotesapp.com/progress_tracking/)<br>観察: T43 |
| T44 | **最大重量、平均重量、総回数、1セット平均回数の推移**<br>強度が上がったか、回数帯を変えたか | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[RepCount Chart Guide](https://support.repcountapp.com/article/35-how-do-i-make-the-most-out-of-the-charts)<br>観察: T44 |
| T45 | **日々の実績線と移動平均/傾向線**<br>日差に埋もれた長期方向 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[RepCount Features](https://www.repcountapp.com/features) / [RepCount Chart Guide](https://support.repcountapp.com/article/35-how-do-i-make-the-most-out-of-the-charts) / [FitNotes Progress Tracking](https://www.fitnotesapp.com/progress_tracking/)<br>観察: T45 |
| T46 | **グラフに伸びているかの判定と変化量**<br>グラフを読めない人も方向を把握 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Gravitus](https://gravitus.com/)<br>観察: T46 |
| T47 | **同じ長さの直前期間を重ねるグラフ**<br>最近28日など、期間を揃えた比較 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察<br>[StrengthLog Home](https://help.strengthlog.com/help-article/the-home-screen/) / [Statistics Explained](https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth)<br>観察: T47 |
| T48 | **月/年の回数・量・セット等の前期差分と平均**<br>生活や計画変更後の実行量 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察<br>[StrengthLog Reports](https://help.strengthlog.com/help-article/training-reports/)<br>観察: T48 |
| T49 | **期間内最小/最大e1RMと総量**<br>最も良い日だけでない変動幅 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[JEFIT 1RM Tracking](https://www.jefit.com/features/one-rep-max)<br>観察: T49 |
| T50 | **種目、部位、全体で切替え、日/週/月/年集約**<br>詳細から全体へ同じ問いを広げる | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[RepCount Features](https://www.repcountapp.com/features) / [RepCount Chart Guide](https://support.repcountapp.com/article/35-how-do-i-make-the-most-out-of-the-charts)<br>観察: T50 |
| T51 | **複数種目を同一図に重ね、組合せをプリセット化**<br>複数の主要種目が同時に伸びているか | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[FitNotes iOS Charts](https://www.getfitnotes.com/docs/stats-graphs-and-charts.html)<br>観察: T51 |
| T52 | **複数グラフの横軸期間を統一**<br>違う開始時期の線を誤比較しない | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Liftosaur Graphs](https://www.liftosaur.com/features/graphs)<br>観察: T52 |
| T53 | **計画変更・実施量・その後の成果を同じ時間軸で見る**<br>どの計画を行っていた時期の変化か | 追加：プログラムの名称/版/変更日時が必要。既存の現在プリセットだけでは変更前後を固定できない。 | P1 | 観察＋整理/案<br>[Liftosaur Graphs](https://www.liftosaur.com/features/graphs)<br>観察: T53, X27 |
| T54 | **グラフ上の点に当日のメモ/プログラム状態を表示**<br>好不調や設定変更の文脈 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftosaur Graphs](https://www.liftosaur.com/features/graphs)<br>観察: T54 |
| T55 | **グラフから実施順を含む当日の全セッションへ移動**<br>後半に回したため落ちたのかを確認 | 追加：元セッションの重量/回数は既存記録。実施した種目順の再現にはイベント列を追加。setOrderは種目内の順序。 | P1 | 観察<br>[Gym Progress](https://www.hevyapp.com/features/gym-progress/)<br>観察: T55 |
| T56 | **100kg×5回以上などの条件で日付を絞るカレンダー**<br>特定の水準を達成した日はいつか | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[FitNotes Calendar](https://www.fitnotesapp.com/calendar/)<br>観察: T56 |
| T57 | **同じ計画の各実施回をセット単位で比較**<br>同じメニューの再現性/改善 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Daptis Progress](https://www.daptis.app/features/progressive-overload-tracking)<br>観察: T57 |
| T58 | **ゼロ起点/自動範囲の縦軸と点選択**<br>小さな上下を誇張せず読む | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[FitNotes Progress Tracking](https://www.fitnotesapp.com/progress_tracking/)<br>観察: T58 |
| T78 | **未完週を同条件で比較し、比較の基準日を示す**<br>週途中を「減った」と誤認させない | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察＋整理/案<br>[Liftosaur Week Insights](https://www.liftosaur.com/features/week-insights)<br>観察: T78, X33 |
| X24 | **同重量のセット別回数、1セット目からの保持率**<br>後半セットの変化 | 記録：同重量・左右・種目内セット順の回数保持率は算出可。実休憩や順序の違いを除いた身体疲労率ではない。 | P0 | 設計案<br>原ノートの仮説・観察を参照<br>観察: X24 |
| X26 | **直近n回の変化、横ばい期間、根拠回数**<br>一度の不調と続く横ばいを分ける | 記録：直近n回の実績と経過日、本人が選ぶ期間を表示。記録のない日を0にしない。 | P0 | 設計案<br>原ノートの仮説・観察を参照<br>観察: X26 |
| X34 | **左右の記録重量・回数・量の差と件数**<br>入力上の偏りを振り返る | 記録：左右別重量/回数/件数の差を算出可。未実施の片側は0にせず、力の左右差や原因を診断しない。 | P0 | 設計案<br>原ノートの仮説・観察を参照<br>観察: X34 |

## 部位・量・頻度

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T59 | **部位別の週セット数と前期間**<br>鍛えたい部位への量が増えたか | 記録：現行の粗いmuscleGroup分類と完了セットから集計可。不明分類の件数と片側/両側の数え方を併記する。 | P0 | 観察<br>[Statistics Explained](https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth) / [How Sets per Muscle Group Works](https://help.hevyapp.com/hc/en-us/articles/44128140257431-How-Does-Sets-per-Muscle-Group-Work)<br>観察: T59 |
| T60 | **主働筋/副働筋・direct/indirectの寄与セットを分ける**<br>複合種目が複数部位へどう加算されたか | 追加：主働/副働の多対多辞書・寄与係数・WU種別が必要。係数付きセットは配分モデルであり筋成長量ではない。 | P1 | 観察<br>[How Sets per Muscle Group Works](https://help.hevyapp.com/hc/en-us/articles/44128140257431-How-Does-Sets-per-Muscle-Group-Work) / [Liftosaur Week Insights](https://www.liftosaur.com/features/week-insights) / [Sets per Muscle](https://gravl.ai/help/sets-per-muscle-track-your-weekly-volume)<br>観察: T60, A48 |
| T61 | **筋別セット数を開くと寄与種目・内訳**<br>なぜ胸が12セットなのか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Liftosaur Week Insights](https://www.liftosaur.com/features/week-insights)<br>観察: T61 |
| T62 | **筋群別セットの個人目標帯と一般的な範囲を区別する**<br>今週その部位を追加/削減するか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Liftosaur Week Insights](https://www.liftosaur.com/features/week-insights) / [Sets per Muscle](https://gravl.ai/help/sets-per-muscle-track-your-weekly-volume)<br>観察: T62, A51 |
| T63 | **部位ごとのトレーニング日数と頻度目標**<br>同量を一度に集中/複数日に分散したか | 追加：実施日数自体は既存記録から算出可。部位別の頻度目標は追加設定。 | P1 | 観察<br>[Liftosaur Week Insights](https://www.liftosaur.com/features/week-insights)<br>観察: T63 |
| T64 | **週内の刺激量累計を個人目標帯に重ねる**<br>週の途中でどこまで実行したか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[JEFIT Progress Index](https://www.jefit.com/features/progress-index)<br>観察: T64 |
| T65 | **部位ごとの刺激量の現在/目標値**<br>次にどの筋へ作業を配分するか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[JEFIT Progress Index](https://www.jefit.com/features/progress-index)<br>観察: T65 |
| T66 | **低回数/高回数セットの数と構成比**<br>重め・回数多めの作業配分 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Liftosaur Week Insights](https://www.liftosaur.com/features/week-insights)<br>観察: T66 |
| T67 | **上半身/下半身/体幹/Push/Pull/Legs別のセット**<br>部位とは別の動作群で偏りを見る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Liftosaur Week Insights](https://www.liftosaur.com/features/week-insights)<br>観察: T67 |
| T68 | **垂直Push/Pull、水平Push/Pull、Squat/Hingeの比率**<br>対向する動作パターンの不足 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[JEFIT Progress Index](https://www.jefit.com/features/progress-index)<br>観察: T68 |
| T69 | **大きな筋群から細かな部位配分へ展開する**<br>「背中の日」の中で何をしているか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[JEFIT BodyMap](https://www.jefit.com/features/bodymap) / [Sets per Muscle](https://gravl.ai/help/sets-per-muscle-track-your-weekly-volume)<br>観察: T69, A52 |
| T70 | **実施部位の前後ボディマップを週別に表示**<br>未実施部位を直感的に見つける | 記録：既存の粗い部位を実施量の地図として表示。細かな筋・回復・活性化率に置き換えない。 | P1 | 観察<br>[Statistics Explained](https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth)<br>観察: T70 |
| T73 | **種目/部位の使用頻度ランキング**<br>特定種目への依存、最近使っていない種目 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P1 | 観察<br>[Statistics Explained](https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth) / [RepCount Chart Guide](https://support.repcountapp.com/article/35-how-do-i-make-the-most-out-of-the-charts)<br>観察: T73 |
| A49 | **週と直近7日を切り替える**<br>週境界の見かけのゼロを避ける | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Sets per Muscle](https://gravl.ai/help/sets-per-muscle-track-your-weekly-volume)<br>観察: A49 |
| A50 | **4週平均と今週を比べる**<br>一時的な変動を判断 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Sets per Muscle](https://gravl.ai/help/sets-per-muscle-track-your-weekly-volume)<br>観察: A50 |
| A53 | **総挙上量を種目別・外部負荷/自重別に分けて示す**<br>メニュー変更による数字の上下を理解 | 追加：外部負荷の量は既存から算出可。身体質量寄与・assisted/weighted・可変抵抗の種別を追加し合算規則を固定する。 | P2 | 観察<br>[Dashboard](https://help.macrofactorapp.com/en/articles/275-getting-to-know-your-workouts-dashboard) / [Personalized Weekly Targets](https://knowledge.tonal.com/kb/guide/en/how-to-use-personalized-weekly-targets-IcOTXeWcYl/Steps/4353081)<br>観察: A53, D08 |
| A54 | **volume変化の寄与が大きい種目を示す**<br>何を増減したか知る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Dashboard](https://help.macrofactorapp.com/en/articles/275-getting-to-know-your-workouts-dashboard)<br>観察: A54 |
| D06 | **筋力：強度閾値以上のセット数**<br>閾値は製品/目的別の定義 | 記録：完了セットとe1RMから閾値判定できる。閾値の出典と推定値の条件を表示し、普遍的な適正量とはしない。 | P2 | 観察<br>[Personalized Weekly Targets](https://knowledge.tonal.com/kb/guide/en/how-to-use-personalized-weekly-targets-IcOTXeWcYl/Steps/4353081)<br>観察: D06 |
| D09 | **ボリューム：総慣性負荷**<br>フライホイールをkgと混ぜない | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Available metrics](https://enode.ai/apps/help/articles/1777540390-available-metrics)<br>観察: D09 |

## セッション・休憩・時間

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T19 | **セット完了数/予定数と未実施箇所**<br>残りの作業、飛ばした箇所 | 記録：現在のセット一覧に対する完了/残りは算出可能。当初の計画達成率には開始時の分母を別保存する。 | P0 | 観察<br>[GymBook](https://gymbookapp.com/) / [Liftosaur Workout](https://api3.liftosaur.com/features/workout-screen)<br>観察: T19 |
| T20 | **目標未達・未実施・成功0回の試技・追加失敗を区別する**<br>失敗とスキップを混同しない | 追加：既存の完了/skipは利用できる。0成功回・失敗試技・技術的失敗を表す状態を追加し、既存の正の回数検証を見直す。 | P1 | 観察<br>[StrongLifts Logging Sets](https://support.stronglifts.com/article/212-log-sets) / [Strong: Set Tags](https://help.strongapp.io/article/166-set-tags) / [Hevy: Set Types](https://help.hevyapp.com/hc/en-us/articles/34896293707927-Set-Types-in-Hevy-Explained-Drop-Sets-Warm-Up-Sets-and-More)<br>観察: T20, X21 |
| T21 | **休憩残りだけでなくゼロ後の超過時間**<br>実際に何分休んだか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Alpha Complete Guide](https://alphaprogression.com/en/blog/alpha-progression-guide)<br>観察: T21 |
| T76 | **終了直後に時間・量・セット・PR・部位・主観RPE**<br>今日の作業と主観をまとめて振り返る | 追加：重量・回数・量・経過時間・PRは既存記録。RPEや正確な当初計画との差には追加入力/保存が必要。 | P1 | 観察<br>[JEFIT FAQ](https://www.jefit.com/support/faq)<br>観察: T76 |
| T77 | **実動・休憩・器具準備/調整の時間内訳**<br>長時間の理由、短縮できる箇所 | 追加：セット開始/終了、休憩開始/終了、中断/準備のイベントが必要。createdAt/updatedAtや終了−開始から内訳を捏造しない。 | P2 | 観察<br>[JEFIT FAQ](https://www.jefit.com/support/faq)<br>観察: T77 |
| A60 | **予定/開始中/完了/skipを明確に分ける**<br>記録の意味を理解 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Accountability dashboard](https://help.voltathletics.com/how-do-i-track-accountability-on-my-dashboard)<br>観察: A60 |
| A61 | **終了・skipを一緒にした指標は分子の定義を表示**<br>成功率を誤読しない | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 設計案<br>[Accountability dashboard](https://help.voltathletics.com/how-do-i-track-accountability-on-my-dashboard)<br>観察: A61 |
| A65 | **実時間と開始/終了の訂正を示す**<br>放置時間を実運動時間と誤認しない | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P1 | 観察<br>[Logging your Training Session](https://support.trainheroic.com/hc/en-us/articles/18156631592589-Logging-your-Training-Session)<br>観察: A65 |
| D64 | **休憩：セット間の実際の休憩、目標との関係**<br>同条件比較の文脈 | 追加：目標休憩は現行設定。実休憩の履歴には開始/終了/中断イベントを追加する。 | P2 | 観察<br>[Getting Started With Strength Training](https://support.garmin.com/en-NZ/?faq=LcYGZd4EOZ9PkTY5YRvin5) / [Training screen](https://support.vitruve.fit/understanding-the-vbt-training-screen)<br>観察: D64 |
| D65 | **休憩：心拍を見た延長の提案/自動延長**<br>心拍と筋回復を同一視しない | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[A New Era for Tempo](https://tempo.fit/blog/a-new-era-for-tempo) / [3D Tempo Vision](https://support.tempo.fit/support/solutions/articles/151000154714-3d-tempo-vision-form-feedback)<br>観察: D65 |
| X20 | **superset/circuitの所属とA1→B1の実施順**<br>何を交互に行い、何が残るか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Strong: Supersets / Circuits](https://help.strongapp.io/article/98-how-do-i-create-supersets)<br>観察: X20 |
| X25 | **同じ種目/課題の量÷セッション経過分**<br>限られた時間での実施密度 | 記録：完了した外部重量×回数をセッション経過分で割る。同じ種目構成・中断条件で比較し、実動効率と呼ばない。 | P2 | 設計案<br>原ノートの仮説・観察を参照<br>観察: X25 |
| X28 | **残りの予定セットと、残り時間に対する所要時間の目安**<br>時間内でどこまで行えるか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 設計案<br>原ノートの仮説・観察を参照<br>観察: X28 |

## 習慣・継続・目標

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T79 | **週の実施回数・筋群・種目・セットの目標と残りを示す**<br>生活に合った頻度を守れたか | 追加：回数等の実績と現行の継続週は既存。週目標・筋群/セット目標・分母となる計画を追加する。 | P1 | 観察<br>[Profile Widgets](https://help.strongapp.io/article/239-profile-widgets) / [StrengthLog Streaks](https://help.strengthlog.com/help-article/streaks/) / [Dashboard](https://help.macrofactorapp.com/en/articles/275-getting-to-know-your-workouts-dashboard)<br>観察: T79, A47 |
| T80 | **特定種目・部位の回数/量/セットの継続目標**<br>自分固有の習慣が続いているか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[StrengthLog Streaks](https://help.strengthlog.com/help-article/streaks/)<br>観察: T80 |
| T81 | **現在/最長継続、達成日、未達の日と不足量**<br>長期継続と躓いた箇所 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[StrengthLog Streaks](https://help.strengthlog.com/help-article/streaks/)<br>観察: T81 |
| T82 | **実施部位付きカレンダーと週/月/年の集計を行き来する**<br>休み日を含む実施配列 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察＋整理/案<br>[FitNotes Calendar](https://www.fitnotesapp.com/calendar/) / [レップログ / AMETENのストア説明](https://apps.apple.com/jp/app/id6799612395)<br>観察: T82, J06, J07 |
| A62 | **予定の遵守率を分母・期間・自主追加分と分けて示す**<br>どこまで実施したか知る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察＋整理/案<br>[Compliance Analytics](https://support.trainheroic.com/hc/en-us/articles/18156702628621-Viewing-Compliance-Analytics) / [ABC Trainerize / Insights](https://help.trainerize.com/hc/en-us/articles/46648417703956-Using-the-Client-Insights-Dashboard) / [Physitrack / Adherence definition](https://support.physitrack.com/article/46-how-is-patient-adherence-calculated)<br>観察: A62, A63, A64 |

## 主観・症状・体調

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| A20 | **パンプの自己評価を種目/筋群に結び付ける**<br>刺激の体感を伝える | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[処方の決まり方](https://hypertrophy.zendesk.com/hc/en-us/articles/14605661323671-How-Does-the-App-Determine-When-to-Add-Weight-Reps-and-Sets)<br>観察: A20 |
| A21 | **次に鍛える時点の筋肉痛を残す**<br>前回量を振り返る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[処方の決まり方](https://hypertrophy.zendesk.com/hc/en-us/articles/14605661323671-How-Does-the-App-Determine-When-to-Add-Weight-Reps-and-Sets)<br>観察: A21 |
| A22 | **「セット量がきつい」という主観を余力と分ける**<br>重量と総量の問題を分ける | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[処方の決まり方](https://hypertrophy.zendesk.com/hc/en-us/articles/14605661323671-How-Does-the-App-Determine-When-to-Add-Weight-Reps-and-Sets)<br>観察: A22 |
| A23 | **関節痛評価を再表示し前回回答を残す**<br>変化を伝える | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[公式リリース履歴・2026-08-03/08-19](https://releases.rpstrength.com/hypertrophy)<br>観察: A23 |
| A24 | **痛み/不快感/筋肉痛の位置と発生タイミングを別欄にする**<br>状況を説明する | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 設計案<br>原ノートの仮説・観察を参照<br>観察: A24 |
| A25 | **難度と別に好き嫌い・満足度・楽しさ・自信を記録する**<br>続けられる内容を選ぶ | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 設計案<br>[公式要望ページ](https://ideas.abcfitness.com/forums/940789-client-gym-members-abc-trainerize/suggestions/43800618-allow-ratings-for-specific-exercises)<br>観察: A25, A74 |
| A27 | **睡眠・気分・活力・ストレス・筋肉痛の主観を別々に示す**<br>何が変わったかを知る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Athlete Pro: Readiness](https://support.trainheroic.com/hc/en-us/articles/18156547276557-Athlete-Pro-Readiness)<br>観察: A27, D63 |
| A28 | **主観readinessの長期平均と最近の平均を並べる**<br>普段からの変化を知る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Athlete Pro: Readiness](https://support.trainheroic.com/hc/en-us/articles/18156547276557-Athlete-Pro-Readiness)<br>観察: A28 |
| A29 | **本人の通常範囲を帯で表示**<br>他人の平均に引かれない | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Athlete Pro: Readiness](https://support.trainheroic.com/hc/en-us/articles/18156547276557-Athlete-Pro-Readiness)<br>観察: A29 |
| A30 | **下位項目ごとの上向き/下向き矢印を表示**<br>合計点に埋もれる問題を発見 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Athlete Pro: Readiness](https://support.trainheroic.com/hc/en-us/articles/18156547276557-Athlete-Pro-Readiness)<br>観察: A30 |
| A31 | **長めに続く偏りと短期の変動を分ける**<br>単日の上下を過大評価しない | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Athlete Pro: Readiness](https://support.trainheroic.com/hc/en-us/articles/18156547276557-Athlete-Pro-Readiness)<br>観察: A31 |
| A43 | **セッション前の値を実施可否の命令にせず、事後の傾向として出す選択肢**<br>数値を気にしすぎず振り返る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Athlete Pro: Readiness](https://support.trainheroic.com/hc/en-us/articles/18156547276557-Athlete-Pro-Readiness)<br>観察: A43 |
| A75 | **skip/変更理由を「痛み・機材待ち・時間・気分」から任意で記録**<br>未達の原因を次回へつなぐ | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 設計案<br>原ノートの仮説・観察を参照<br>観察: A75 |

## 回復・全活動負荷

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T71 | **筋群別の回復推定と時間経過を身体図で示す**<br>部位選択の参考、休ませる部位 | 追加：表示モデルの定義、部位辞書、経過時間、必要なら主観補正。メーカー独自の回復%を再現・実測したとは扱わない。 | P2 | 観察<br>[JEFIT Muscle Recovery](https://www.jefit.com/features/muscle-recovery) / [筋群回復](https://gravl.ai/help/gravl-muscle-fatigue-and-recovery)<br>観察: T71, A37 |
| T72 | **実施配分・局所回復推定・全身readinessを区別する**<br>たくさん実施した事実と回復推定の区別 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[JEFIT BodyMap](https://www.jefit.com/features/bodymap) / [JEFIT Muscle Recovery](https://www.jefit.com/features/muscle-recovery) / [筋群回復](https://gravl.ai/help/gravl-muscle-fatigue-and-recovery)<br>観察: T72, A36 |
| A32 | **センサー由来の全身readinessと手入力を区別**<br>数値の由来を知る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Readiness](https://gravl.ai/help/readiness-know-when-to-push-and-when-to-recover)<br>観察: A32 |
| A33 | **回復/準備点の理由と要素別の寄与を示す**<br>点数低下の理由を知る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Readiness](https://gravl.ai/help/readiness-know-when-to-push-and-when-to-recover) / [Readiness Score](https://ouraring.com/blog/readiness-score/)<br>観察: A33, D71 |
| A34 | **欠測・未認識・校正中・データ不足をゼロと区別する**<br>低い値と欠測を区別 | 記録：欠測/データ不足の表示は現状でも可能。機器別の校正中/認識不能はその連携があるときに追加する。 | P0 | 観察＋整理/案<br>[Readiness](https://gravl.ai/help/readiness-know-when-to-push-and-when-to-recover) / [Getting Started With Strength Training](https://support.garmin.com/en-NZ/?faq=LcYGZd4EOZ9PkTY5YRvin5) / [Training screen](https://support.vitruve.fit/understanding-the-vbt-training-screen)<br>観察: A34, D77, J22 |
| A35 | **朝・日中・運動後で状態の更新時点を明示する**<br>いま取れる行動を知る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Readiness](https://gravl.ai/help/readiness-know-when-to-push-and-when-to-recover) / [Getting started](https://athlyticapp.com/getting-started/)<br>観察: A35, D72 |
| A38 | **次workoutで使う筋群だけを抽出する**<br>今日に関係する値を見る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[筋群回復](https://gravl.ai/help/gravl-muscle-fatigue-and-recovery)<br>観察: A38 |
| A39 | **回復推定の本人による補正とreset状態を表示**<br>体感とのずれを訂正 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[筋群回復](https://gravl.ai/help/gravl-muscle-fatigue-and-recovery)<br>観察: A39 |
| A40 | **外部取込のrun等が回復推定へ影響したと表示**<br>脚の値が変わった理由を知る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Muscle Recovery](https://help.fitbod.me/hc/en-us/articles/360006269014-Muscle-Recovery)<br>観察: A40 |
| A41 | **回復推定の元になった運動と経過を開ける**<br>表示を検証する | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Muscle Recovery](https://help.fitbod.me/hc/en-us/articles/360006269014-Muscle-Recovery)<br>観察: A41 |
| A42 | **今日の負荷と短期/長期の負荷を分ける**<br>今日と蓄積の違いを見る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Readiness](https://gravl.ai/help/readiness-know-when-to-push-and-when-to-recover) / [Training Load](https://support.apple.com/guide/watch/track-your-training-load-apde4c07a6cf/27/watchos/27)<br>観察: A42, D69 |
| D66 | **心血管：種目別/活動中の心拍反応**<br>筋力成果と別軸 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Strength Trainer](https://www.whoop.com/us/en/thelocker/introducing-strength-trainer-a-new-way-to-quantify-the-impact-of-your-strength-training/)<br>観察: D66 |
| D67 | **負荷：心血管/筋負荷の内訳**<br>独自モデルと表示 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Strength Trainer](https://www.whoop.com/us/en/thelocker/introducing-strength-trainer-a-new-way-to-quantify-the-impact-of-your-strength-training/)<br>観察: D67 |
| D68 | **負荷：その日の全活動負荷**<br>仕事/他の運動も含む文脈 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Strength Trainer](https://www.whoop.com/us/en/thelocker/introducing-strength-trainer-a-new-way-to-quantify-the-impact-of-your-strength-training/)<br>観察: D68 |
| D70 | **回復：睡眠/HRV/安静心拍/体温等の基準からの偏り**<br>局所筋の回復率ではない | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Readiness Score](https://ouraring.com/blog/readiness-score/)<br>観察: D70 |
| D73 | **回復：睡眠不足・規則性・必要睡眠の推奨**<br>推奨・推定と表示 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Readiness Score](https://ouraring.com/blog/readiness-score/)<br>観察: D73 |
| D74 | **回復：生活タグと翌日状態の関連**<br>因果と断言しない | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Getting started](https://athlyticapp.com/getting-started/)<br>観察: D74 |
| J05 | **部位ごとの「前回から何日」。ログのない部位を回復済みとは断定しない。**<br>条件・目標・由来を含めて記録を解釈する | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察＋整理/案<br>[筋トレMEMO / 開発者ストア説明](https://apps.apple.com/jp/app/id1109688815)<br>観察: J05 |
| J13 | **一般的な回復と、次のスキルへの到達度を別名称で表示。**<br>条件・目標・由来を含めて記録を解釈する | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[Calistree / Readiness](https://calistree.app/knowledge?id=tipReadiness)<br>観察: J13 |

## 身体・写真・生活

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T83 | **体重の原値・トレンド・変化速度・目標を分ける**<br>水分等の日差から長期変化を分ける | 追加：体重/体脂肪/身長の既存履歴から原値/平滑化は算出可。目標と変化速度の表示ルールは追加設定。 | P1 | 観察＋整理/案<br>[StrongLifts Graphs](https://support.stronglifts.com/article/89-graphs) / [MacroFactor / Weight Trend](https://help.macrofactorapp.com/dashboard/weight_trend) / [MacroFactor / Change Rate](https://help.macrofactorapp.com/en/articles/19-change-rate)<br>観察: T83, J15 |
| T84 | **挙上グラフに体重を重ねる**<br>増減量とパフォーマンス変化が同時か | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Liftosaur Graphs](https://www.liftosaur.com/features/graphs)<br>観察: T84 |
| T85 | **測定方法を揃えた体脂肪率・身体測定の推移**<br>見た目の目標と力の進歩を併せて見る | 追加：体重/体脂肪/身長は既存。周囲径、測定方法・機器ID、部位別値は追加記録。 | P2 | 観察＋整理/案<br>[GymBook](https://gymbookapp.com/) / [Alpha Complete Guide](https://alphaprogression.com/en/blog/alpha-progression-guide) / [InBody / App](https://inbodyusa.com/inbody-app/)<br>観察: T85, J17 |
| T86 | **日付・撮影条件付きの進捗写真を比較する**<br>数値に出ない見た目の変化 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察＋整理/案<br>[Gym Progress](https://www.hevyapp.com/features/gym-progress/) / [Lift1up / 公式](https://lift1up.app/)<br>観察: T86, J16 |
| T87 | **種目・セット・日付へ文章/画像/フォーム動画を結び付ける**<br>数値の条件やフォームを後で確認 | 計測：種目/セットに紐付くメモ・画像/動画の保存が必要。動画への計測値重畳は別の解析/計測。 | P3 | 観察<br>[StrengthLog Video Library](https://help.strengthlog.com/help-article/using-the-video-library/) / [2026更新](https://blog.everfit.io/everfit-may-2026-new-features) / [Comments](https://help.everfit.io/en/articles/4346734-comments-for-completed-workouts)<br>観察: T87, A69 |
| X18 | **任意の月経記録日を訓練カレンダーの文脈として表示**<br>自分の体感と実績を振り返る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[MacroFactor Workouts: Track Your Period](https://help.macrofactorapp.com/en/articles/282-track-your-period)<br>観察: X18 |
| X36 | **食事の時系列・摂取kcal・たんぱく質/脂質/炭水化物**<br>食事の記録を訓練・身体変化と併せて振り返る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[BurnFit 日本語公式](https://burnfit.io/ja/)<br>観察: X36 |
| X37 | **歩数の原値・期間平均と筋トレ日の関係**<br>筋トレ以外の普段の活動量 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察＋整理/案<br>[Dashboard](https://help.macrofactorapp.com/en/articles/275-getting-to-know-your-workouts-dashboard)<br>観察: X37 |
| X38 | **ウォッチ等の推定消費kcalと取得元**<br>心拍由来の運動量の参考 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[REPLOG 開発者のストア説明](https://apps.apple.com/jp/app/id6792484714)<br>観察: X38 |
| X39 | **入力体重/体脂肪率からの推定脂肪量・除脂肪量**<br>体重の上下の内訳を振り返る | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[2026-10-10公式更新](https://dr-muscle.com/new-dr-muscle-x-2026/)<br>観察: X39 |
| J18 | **部位別除脂肪や水分由来の値を、負荷マップや実測筋力と別に扱う。**<br>条件・目標・由来を含めて記録を解釈する | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察＋整理/案<br>[InBody / 結果解説](https://qr.inbody.com/ri/770/adult/en)<br>観察: J18 |

## 自重・技能・競技

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| X01 | **ベンチマークの名称・定義と過去の自己記録**<br>同じ課題を再実施した成果か | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[SugarWOD: New Scoring Capabilities](https://www.sugarwod.com/2018/05/advanced-scoring-capablities/)<br>観察: X01 |
| X02 | **AMRAPの完了rounds+端数reps**<br>制限時間内の達成量 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[SugarWOD: New Scoring Capabilities](https://www.sugarwod.com/2018/05/advanced-scoring-capablities/)<br>観察: X02 |
| X03 | **For Timeの完了秒数・短縮量**<br>同じ課題をより短く終えたか | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[SugarWOD: New Scoring Capabilities](https://www.sugarwod.com/2018/05/advanced-scoring-capablities/)<br>観察: X03 |
| X04 | **ラウンド合計・最速・最遅・平均**<br>後半の失速とペース配分 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[SugarWOD: New Scoring Capabilities](https://www.sugarwod.com/2018/05/advanced-scoring-capablities/)<br>観察: X04 |
| X06 | **高い方がよい/低い方がよい/採点なしの指標方向**<br>時間短縮を減点しない | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 設計案<br>[SugarWOD: New Scoring Capabilities](https://www.sugarwod.com/2018/05/advanced-scoring-capablities/)<br>観察: X06 |
| X07 | **種目ごとの集団内レベルを並べた能力差**<br>単純なkgの比では見えない得手不得手 | 外部基準：比較集団・競技結果・基準表などの外部データと、その出典・対象条件が必要。 | P3 | 観察<br>[btwb: Imbalances](https://support.btwb.com/en/support/solutions/articles/35000172954-how-does-the-imbalances-feature-work-)<br>観察: X07 |
| X08 | **比較に不足する種目・有効な記録期間**<br>なぜ能力差をまだ出せないか | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[btwb: Imbalances](https://support.btwb.com/en/support/solutions/articles/35000172954-how-does-the-imbalances-feature-work-)<br>観察: X08 |
| X09 | **第1/2/3試技の成功率と件数・比較集団**<br>一発の最高値以外の試技の再現性 | 外部基準：自身の試技成功率には成功/失敗・試技位置を追加保存。競技者集団と比べる場合は公式結果と対象条件が必要。 | P3 | 観察＋整理/案<br>[Ironwise: Performance Profile](https://www.ironwise.app/learn/performance-profile)<br>観察: X09 |
| X10 | **Snatch/Clean & Jerk/Totalの比と推移**<br>得意な種目と練習テーマ | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Ironwise: Performance Profile](https://www.ironwise.app/learn/performance-profile)<br>観察: X10 |
| X12 | **体重階級の変更と競技記録の時間軸**<br>階級移動の前後を理解 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Ironwise: Performance Profile](https://www.ironwise.app/learn/performance-profile)<br>観察: X12 |
| X13 | **クライミングのgrade・試行数・完登/未完登**<br>同じ難度に対する成功と試行効率 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Crimpd: Summer 2026 Updates](https://crimpd.com/blog/summer-2026-updates/)<br>観察: X13 |
| X14 | **board/layout・壁角度・hold種類の条件**<br>別課題の同じgradeを過度に比較しない | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Crimpd: Summer 2026 Updates](https://crimpd.com/blog/summer-2026-updates/)<br>観察: X14 |
| X15 | **最大/通常セッション/一撃flashの別々の技能履歴**<br>過去一度の最高難度と再現できる難度 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Crimpd: Summer 2026 Updates](https://crimpd.com/blog/summer-2026-updates/)<br>観察: X15 |
| X16 | **筋力・持久力・技術等のカテゴリー別実施分数**<br>筋群以外の練習配分 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Crimpd: Getting Started](https://www.crimpd.com/docs/getting-started/)<br>観察: X16 |
| X17 | **自己申告の25/50/75/100%完了と実セット数を別表示**<br>大まかな報告と詳細な実績の差 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[Crimpd: Getting Started](https://www.crimpd.com/docs/getting-started/)<br>観察: X17 |
| X40 | **習熟に基づく累積XP・技能の達成履歴**<br>最高重量以外の積み重ねを認める | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Calistree: Progress Analytics](https://calistree.com/features/progress-analytics/)<br>観察: X40 |
| J11 | **スキルツリーで、到達済み・練習中・次に必要な前提動作を分ける。**<br>条件・目標・由来を含めて記録を解釈する | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[Calistree / Skill trees](https://calistree.app/knowledge?id=skillTrees)<br>観察: J11 |
| J12 | **習熟を示す回数/保持時間の要件と実績。**<br>条件・目標・由来を含めて記録を解釈する | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[Calistree / Mastery](https://calistree.app/knowledge?id=tipMastery)<br>観察: J12 |
| J14 | **強さ・柔軟・バランス・有酸素の個別プロファイル。**<br>条件・目標・由来を含めて記録を解釈する | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[Calistree: Progress Analytics](https://calistree.com/features/progress-analytics/)<br>観察: J14 |
| J20 | **競技と練習の別・試技の成功/失敗と記録条件を示す**<br>条件・目標・由来を含めて記録を解釈する | 外部基準：自身の試技には追加フィールド。公式大会結果の表示には出典/大会/日付/ルール/階級の外部データが必要。 | P3 | 観察＋整理/案<br>[OpenPowerlifting / FAQ](https://www.openpowerlifting.org/faq) / [IPF / GL Formula](https://www.powerlifting.sport/rules/codes/info/ipf-formula) / [Ironwise: Performance Profile](https://www.ironwise.app/learn/performance-profile)<br>観察: J20, X11 |

## 速度・力・パワー

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| D10 | **速度：求心の平均速度**<br>同種目・同重量・意図をそろえる | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D10 |
| D11 | **速度：求心の最大速度**<br>平均とは別、サンプリングにも依存 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D11 |
| D12 | **速度：推進局面だけの平均速度**<br>全求心局面の平均と別 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve) / [Available metrics](https://enode.ai/apps/help/articles/1777540390-available-metrics)<br>観察: D12 |
| D13 | **速度：遠心の平均/最大/最小速度**<br>速く下ろすことを常に高評価にしない | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D13 |
| D14 | **速度：最大速度に達するまでの時間**<br>爆発的運動の詳細 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D14 |
| D15 | **速度：最初・最後・最速・最遅レップ**<br>最初の状態とセット末を分離 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: D15 |
| D16 | **速度：セット内速度低下の絶対差/率**<br>「疲労%」と断定せず定義を示す | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve) / [Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: D16 |
| D17 | **速度：セット間の速度低下**<br>セット/重量/休憩条件をそろえる | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D17 |
| D18 | **速度：同じ重量・種目での前回/基準期間との差**<br>重量を増やさない日の成長を見る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: D18 |
| D19 | **速度：過去最速/最遅の条件付き記録**<br>一律に速い方が良いとは限らない | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve) / [Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: D19 |
| D20 | **速度：目標速度帯、逸脱レップの色**<br>次の負荷調整へつなぐ | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D20 |
| D21 | **速度：速度低下が閾値に達した通知**<br>セット停止のコーチング支援 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D21 |
| D22 | **プロファイル：負荷—速度の点・回帰線**<br>前提条件/採用データを確認 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: D22 |
| D23 | **プロファイル：各負荷の%1RMと目標速度**<br>数式を読ませず目標へ | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D23 |
| D24 | **パワー：求心/遠心の平均/最大パワー**<br>装置/計算方法依存、代謝カロリーではない | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve)<br>観察: D24 |
| D25 | **パワー：W/kg**<br>体重更新が必要 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Parameters](https://gymaware.zendesk.com/hc/en-us/articles/115000820192-What-parameters-does-GymAware-measure)<br>観察: D25 |
| D26 | **パワー：Power PR、PRの一定比以上のレップ数**<br>「質のある反復」を製品定義 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Personalized Weekly Targets](https://knowledge.tonal.com/kb/guide/en/how-to-use-personalized-weekly-targets-IcOTXeWcYl/Steps/4353081)<br>観察: D26 |
| D27 | **力：求心/遠心の平均/最大力**<br>直接計測か計算か明示 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve) / [Parameters](https://gymaware.zendesk.com/hc/en-us/articles/115000820192-What-parameters-does-GymAware-measure)<br>観察: D27 |
| D28 | **力：等尺性最大力、握力**<br>専用試験、日常セットと区別 | 計測：規定姿勢と力センサー/握力計。kgの入力は力Nの実測ではない。 | P3 | 観察<br>[EMG and Hand Dynamometry](https://delsys.com/emg-hand-dynamometry/) / [Tindeq: Progressor](https://tindeq.com/p/)<br>観察: D28 |
| D29 | **力：体重あたりの力**<br>W/kgとは別の単位 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Raw data and phases](https://support.vald.com/hc/en-au/articles/4999754213657-Understanding-Key-Moments-and-Phases-in-ForceDecks) / [Default metrics](https://valdhealth.com/news/smarter-defaults-for-aligned-decision-making-in-forcedecks)<br>観察: D29 |
| D30 | **力：RFD、早期区間での力発揮**<br>短区間/開始点の定義が重要 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Available metrics](https://enode.ai/apps/help/articles/1777540390-available-metrics) / [Parameters](https://gymaware.zendesk.com/hc/en-us/articles/115000820192-What-parameters-does-GymAware-measure)<br>観察: D30 |
| D31 | **力：最大力/最大パワーまでの時間**<br>上級者向けの時系列解析 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Available metrics](https://enode.ai/apps/help/articles/1777540390-available-metrics) / [Parameters](https://gymaware.zendesk.com/hc/en-us/articles/115000820192-What-parameters-does-GymAware-measure)<br>観察: D31 |
| D32 | **力：力積、局面ごとの力積**<br>力×時間、kgの総重量とは別 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Parameters](https://gymaware.zendesk.com/hc/en-us/articles/115000820192-What-parameters-does-GymAware-measure)<br>観察: D32 |
| D33 | **仕事：機械的仕事量J/kJ**<br>ROMと力が要る、消費kcalと区別 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Personalized Weekly Targets](https://knowledge.tonal.com/kb/guide/en/how-to-use-personalized-weekly-targets-IcOTXeWcYl/Steps/4353081) / [Parameters](https://gymaware.zendesk.com/hc/en-us/articles/115000820192-What-parameters-does-GymAware-measure)<br>観察: D33 |
| D34 | **加速度：平均/最大加速度**<br>速度より誤差に敏感な派生量 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve) / [Available metrics](https://enode.ai/apps/help/articles/1777540390-available-metrics)<br>観察: D34 |
| D35 | **加速度：各社のAcceleration Index等**<br>定義の違う独自派生値 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Metrics](https://support.vitruve.fit/metrics-calculated-by-vitruve) / [Available metrics](https://enode.ai/apps/help/articles/1777540390-available-metrics)<br>観察: D35 |

## 可動域・テンポ・動画

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| D36 | **ROM：レップごとの移動距離/垂直距離**<br>バーの距離と関節ROMを区別 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Product overview](https://www.outputsports.com/)<br>観察: D36 |
| D37 | **ROM：関節別の角度/可動域**<br>規定姿勢/撮影条件が必要 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Product overview](https://www.outputsports.com/)<br>観察: D37 |
| D38 | **ROM：最初/最後/最短/最長ROM**<br>平均に隠れる短縮を知る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: D38 |
| D39 | **ROM：ROMの差/低下率**<br>意図的な部分反復もある | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: D39 |
| D40 | **ROM：目標ROM帯と達成レップ合否**<br>目標の根拠と個別化が必要 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[A New Era for Tempo](https://tempo.fit/blog/a-new-era-for-tempo) / [3D Tempo Vision](https://support.tempo.fit/support/solutions/articles/151000154714-3d-tempo-vision-form-feedback) / [Product overview](https://www.outputsports.com/)<br>観察: D40 |
| D41 | **テンポ：遠心—底停止—求心—上停止の時間**<br>4局面の指示と実績 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Training metrics](https://metric.coach/docs/training-metrics) / [Changelog](https://metric.coach/updates)<br>観察: D41 |
| D42 | **テンポ：レップ総時間・TUT**<br>何をTUTに含めるか定義 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Training metrics](https://metric.coach/docs/training-metrics) / [Changelog](https://metric.coach/updates)<br>観察: D42 |
| D43 | **テンポ：レップ頻度/ペース**<br>目標テンポを選んだときに出す | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Parameters](https://gymaware.zendesk.com/hc/en-us/articles/115000820192-What-parameters-does-GymAware-measure)<br>観察: D43 |
| D44 | **動作軌道：矢状面/前額面の軌道**<br>スクワット等の軌道の変化 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Available metrics](https://enode.ai/apps/help/articles/1777540390-available-metrics)<br>観察: D44 |
| D45 | **動作軌道：同一セット内のレップ軌道比較**<br>再現性を見る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[FLEX](https://gymaware.com/product/flex-barbell-tracker/)<br>観察: D45 |
| D46 | **対称性：左右の力配分/左右差**<br>左右差の単位・計算式を示す | 計測：力計/機器等の左右同時計測。手入力重量/回数の左右差は別の指標X34。 | P3 | 観察<br>[Raw data and phases](https://support.vald.com/hc/en-au/articles/4999754213657-Understanding-Key-Moments-and-Phases-in-ForceDecks) / [Default metrics](https://valdhealth.com/news/smarter-defaults-for-aligned-decision-making-in-forcedecks)<br>観察: D46 |
| D47 | **対称性：減速時/蹴り出し時の力積左右差**<br>同じ跳躍高でも戦略が違う | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Raw data and phases](https://support.vald.com/hc/en-au/articles/4999754213657-Understanding-Key-Moments-and-Phases-in-ForceDecks) / [Default metrics](https://valdhealth.com/news/smarter-defaults-for-aligned-decision-making-in-forcedecks)<br>観察: D47 |
| D48 | **フォーム：よくある崩れの合図と修正できた通知**<br>常時監視・無謬を演出しない | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[A New Era for Tempo](https://tempo.fit/blog/a-new-era-for-tempo) / [3D Tempo Vision](https://support.tempo.fit/support/solutions/articles/151000154714-3d-tempo-vision-form-feedback)<br>観察: D48 |
| D49 | **フォーム：滑らかさ・バランス等の検知**<br>どこまで観測できるか明示 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Quick Start Guide](https://tonal.com/blogs/all/tonal-quick-start-guide)<br>観察: D49 |
| D50 | **映像：レップ動画+軌道+数値**<br>変化の原因を振り返る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Training metrics](https://metric.coach/docs/training-metrics) / [Changelog](https://metric.coach/updates)<br>観察: D50 |
| D51 | **映像：前回/今回の同期並列再生**<br>重量グラフにない成果 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Onform guide](https://support.onform.com/article/153-user-guide-onform-video-analysis-app) / [Comparison and synchronization](https://www.kinovea.org/help/en/observation/comparison.html)<br>観察: D51 |
| D52 | **映像：透過重畳、スロー、コマ送り**<br>カメラ角度をそろえる | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Onform guide](https://support.onform.com/article/153-user-guide-onform-video-analysis-app) / [Comparison and synchronization](https://www.kinovea.org/help/en/observation/comparison.html)<br>観察: D52 |
| D53 | **映像：複数カメラの同期表示**<br>上級コーチング用 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Onform guide](https://support.onform.com/article/153-user-guide-onform-video-analysis-app) / [Comparison and synchronization](https://www.kinovea.org/help/en/observation/comparison.html)<br>観察: D53 |
| D54 | **映像：線・角度・時点の注釈/音声説明**<br>判断を他者と共有する | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Onform guide](https://support.onform.com/article/153-user-guide-onform-video-analysis-app) / [Comparison and synchronization](https://www.kinovea.org/help/en/observation/comparison.html)<br>観察: D54 |

## 能力試験・専門計測

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| D07 | **持久力：規定負荷/ROMでの合格レップ数**<br>不完全レップと未記録を分ける | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[A New Era for Tempo](https://tempo.fit/blog/a-new-era-for-tempo) / [3D Tempo Vision](https://support.tempo.fit/support/solutions/articles/151000154714-3d-tempo-vision-form-feedback)<br>観察: D07 |
| D55 | **跳躍：跳躍高、飛翔/接地時間**<br>筋トレ外のテスト結果 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Parameters](https://gymaware.zendesk.com/hc/en-us/articles/115000820192-What-parameters-does-GymAware-measure)<br>観察: D55 |
| D56 | **跳躍：RSI/RSI-mod**<br>反応性と動作時間を合わせる | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Raw data and phases](https://support.vald.com/hc/en-au/articles/4999754213657-Understanding-Key-Moments-and-Phases-in-ForceDecks) / [Default metrics](https://valdhealth.com/news/smarter-defaults-for-aligned-decision-making-in-forcedecks)<br>観察: D56 |
| D57 | **跳躍：沈み込み深さ/遠心最大速度**<br>結果と動作戦略を分ける | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Raw data and phases](https://support.vald.com/hc/en-au/articles/4999754213657-Understanding-Key-Moments-and-Phases-in-ForceDecks) / [Default metrics](https://valdhealth.com/news/smarter-defaults-for-aligned-decision-making-in-forcedecks)<br>観察: D57 |
| D58 | **跳躍：力・速度・パワーの時系列/局面色**<br>競技/研究向け | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Raw data and phases](https://support.vald.com/hc/en-au/articles/4999754213657-Understanding-Key-Moments-and-Phases-in-ForceDecks) / [Default metrics](https://valdhealth.com/news/smarter-defaults-for-aligned-decision-making-in-forcedecks)<br>観察: D58 |
| D59 | **能力試験：Nordic失敗角度/変位/時間**<br>特定試験の指標 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Parameters](https://gymaware.zendesk.com/hc/en-us/articles/115000820192-What-parameters-does-GymAware-measure) / [Product overview](https://www.outputsports.com/)<br>観察: D59 |
| D60 | **能力試験：静的バランス/姿勢安定性**<br>計測姿勢と試験時間を併記 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Product overview](https://www.outputsports.com/)<br>観察: D60 |
| D61 | **他競技：スプリント最高速度・区間タイム・力速度図**<br>全身負荷に関係する別軸の成果 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[K-Power](https://kinvent.com/kinvent-product/horizontal-vertical-gait-analysis-speed-sensor-k-power/)<br>観察: D61 |
| D75 | **生体：EMGの振幅/タイミング/周波数**<br>研究/指導用、筋肥大そのものではない | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[EMG and Hand Dynamometry](https://delsys.com/emg-hand-dynamometry/)<br>観察: D75 |
| D76 | **生体：局所SmO2と相対THbの時系列**<br>腕時計SpO2と違う | 計測：局所NIRS。SmO2は割合、THbは相対/任意単位。腕時計SpO2、血液検査、全身回復率とは別。 | P3 | 観察<br>[SmO2 vs THb](https://my.moxymonitor.com/blog/how-to-use-moxy-monitor-more-effectively-smo2-vs-thb-what-are-they-whats-the-difference)<br>観察: D76 |

## コーチ・共有

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T91 | **個人記録・月次レポート・継続を画像化**<br>他人へ説明できる達成の形 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Gym Progress](https://www.hevyapp.com/features/gym-progress/) / [StrengthLog Reports](https://help.strengthlog.com/help-article/training-reports/) / [StrengthLog Streaks](https://help.strengthlog.com/help-article/streaks/)<br>観察: T91 |
| A66 | **所要時間・セット完了率をコーチが一覧で見る**<br>状況を把握する | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P2 | 観察<br>[Accountability dashboard](https://help.voltathletics.com/how-do-i-track-accountability-on-my-dashboard)<br>観察: A66 |
| A67 | **RX/Scaledと変更した動作・負荷の条件を示す**<br>比較条件をそろえる | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[Logging your Training Session](https://support.trainheroic.com/hc/en-us/articles/18156631592589-Logging-your-Training-Session)<br>観察: A67, X05 |
| A68 | **種目tag付きの実施・感想・症状・質問を時系列で見る**<br>文脈を探さず伝える | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[2026更新](https://blog.everfit.io/everfit-may-2026-new-features) / [Comments](https://help.everfit.io/en/articles/4346734-comments-for-completed-workouts) / [ABC Trainerize / Insights](https://help.trainerize.com/hc/en-us/articles/46648417703956-Using-the-Client-Insights-Dashboard)<br>観察: A68, J21 |
| A70 | **過去のフォームcue・痛みflag・進行メモを種目横断履歴で表示**<br>同じ問題を繰り返さない | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[2026更新](https://blog.everfit.io/everfit-may-2026-new-features) / [Comments](https://help.everfit.io/en/articles/4346734-comments-for-completed-workouts)<br>観察: A70 |
| A72 | **要フォロー/未実施増加/計画終了間近をコーチに通知**<br>支援のタイミングを知る | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[公式トップ](https://truecoach.co/)<br>観察: A72 |
| A73 | **チーム共有かコーチのみかの範囲を表示**<br>誰に見えるか選ぶ | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[Logging your Training Session](https://support.trainheroic.com/hc/en-us/articles/18156631592589-Logging-your-Training-Session)<br>観察: A73 |

## データ品質・定義

| ID | 表示候補・判断 | 必要データ・制約 | 優先 | 根拠 |
|---|---|---|---|---|
| T88 | **初回・履歴不足では前回値や推奨を数値ゼロで埋めない**<br>未記録をゼロ・低実力と誤認しない | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察<br>[Previous Workout Values](https://www.hevyapp.com/features/track-exercises/) / [Alpha Progression glossary](https://alphaprogression.com/en/glossary/progression-recommendations) / [Smart Progressions](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions)<br>観察: T88, A11 |
| T89 | **2回未満のグラフをサンプルと明示/初期案内**<br>実データが足りない事実と次の操作 | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P0 | 観察<br>[Daptis Progress](https://www.daptis.app/features/progressive-overload-tracking) / [Liftosaur Graphs](https://www.liftosaur.com/features/graphs)<br>観察: T89 |
| T90 | **自分に必要なダッシュボード項目を選び並べ替える**<br>目的に不要な指標を毎回読まない | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P1 | 観察＋整理/案<br>[Profile Widgets](https://help.strongapp.io/article/239-profile-widgets) / [Liftosaur Graphs](https://www.liftosaur.com/features/graphs) / [Tailrep / 公式](https://tailrep.com/)<br>観察: T90, J24 |
| T94 | **WU・片側・自重/補助・丸め等の集計定義を示す**<br>数字の定義が違う比較を避ける | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Bodyweight vs Assisted vs Weighted](https://help.hevyapp.com/hc/en-us/articles/44098622782487-Bodyweight-Exercises-in-Hevy-Bodyweight-vs-Assisted-vs-Weighted) / [How Sets per Muscle Group Works](https://help.hevyapp.com/hc/en-us/articles/44128140257431-How-Does-Sets-per-Muscle-Group-Work) / [GymBook FAQ](https://gymbookapp.com/faq)<br>観察: T94, X22 |
| T95 | **秒と反復を混ぜた表示の換算前提を明記**<br>便宜的な共通単位と実測値の区別 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察<br>[GymBook FAQ](https://gymbookapp.com/faq)<br>観察: T95 |
| D78 | **品質：レップ/種目/重量を訂正する表示**<br>正しい履歴を作る | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Getting Started With Strength Training](https://support.garmin.com/en-NZ/?faq=LcYGZd4EOZ9PkTY5YRvin5) / [Training screen](https://support.vitruve.fit/understanding-the-vbt-training-screen)<br>観察: D78 |
| D79 | **品質：撮影角度/照明/見切れ/認識の警告**<br>測定前に品質を上げる | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Training metrics](https://metric.coach/docs/training-metrics) / [Changelog](https://metric.coach/updates)<br>観察: D79 |
| D80 | **品質：推定に採用/除外した点の可視化**<br>ブラックボックスを減らす | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: D80 |
| D82 | **品質：設定抵抗/適用抵抗/抵抗方式を区別**<br>可変抵抗・片側ケーブルの誤解防止 | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[FAQ](https://vitruvianform.com/pages/faqs) / [Biostrength REV](https://www.technogym.com/en-GB/biostrength-rev/)<br>観察: D82 |
| D83 | **品質：センサー接続/電池/計測中の状態**<br>欠測に気づいて修正できる | 計測：撮影/手計時、専用センサー、またはウォッチ/ヘルス連携の実データが必要。重量×回数だけから実測値を作らない。 | P3 | 観察<br>[Set metrics](https://www.reponestrength.com/metrics) / [Knowledge base](https://www.reponestrength.com/knowledge)<br>観察: D83 |
| X19 | **通常・warm-up・drop・failure等のセット種別**<br>そのセットの目的と集計対象 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 観察<br>[Strong: Set Tags](https://help.strongapp.io/article/166-set-tags) / [Hevy: Set Types](https://help.hevyapp.com/hc/en-us/articles/34896293707927-Set-Types-in-Hevy-Explained-Drop-Sets-Warm-Up-Sets-and-More)<br>観察: X19 |
| X23 | **保存前に記録を確認・修正できる結果一覧**<br>誤記録を後の統計へ持ち込まない | 記録：現在の重量・回数・左右・完了フラグ・種目/セッション日・粗い部位・身体測定から集計可能。比較条件の限界を付記。 | P1 | 観察<br>[Crimpd: Summer 2026 Updates](https://crimpd.com/blog/summer-2026-updates/)<br>観察: X23 |
| X31 | **修正/取込/削除による再集計の前後と理由**<br>実施していない日にグラフが変わった理由 | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P1 | 設計案<br>原ノートの仮説・観察を参照<br>観察: X31 |
| X35 | **部位分類不明のセット数と集計対象外の理由**<br>マップに現れないデータへ気づく | 記録：muscleGroupが空または辞書未対応の件数。不明分類を勝手に筋群へ割り当てない。 | P0 | 設計案<br>原ノートの仮説・観察を参照<br>観察: X35 |
| X41 | **機能的動作/動作品質を鍛える構成の週スコア**<br>計画で選んだ練習内容を振り返る | 外部基準：比較集団・競技結果・基準表などの外部データと、その出典・対象条件が必要。 | P3 | 観察<br>[Personalized Weekly Targets](https://knowledge.tonal.com/kb/guide/en/how-to-use-personalized-weekly-targets-IcOTXeWcYl/Steps/4353081)<br>観察: X41 |
| J03 | **補助あり/なし、加重/アシストの別。アシスト重量の減少が進歩になる。**<br>条件・目標・由来を含めて記録を解釈する | 追加：assisted/weighted/bodyweightと補助量を構造化。補助は小さい方が改善となる場合を区別。 | P2 | 観察＋整理/案<br>[筋トレMEMO / 開発者ストア説明](https://apps.apple.com/jp/app/id1109688815) / [Calistree / Assistance and resistance](https://calistree.app/knowledge?id=tipResistAssist)<br>観察: J03 |
| J04 | **バンドの張力基準と換算元。メーカーの色名だけを負荷に置き換えない。**<br>条件・目標・由来を含めて記録を解釈する | 追加：任意入力・目標/分類の設定・計画スナップショット・計測時刻、または推定ルールの設計が必要。既存ログのみでは全機能を再現できない。 | P2 | 観察＋整理/案<br>[Calistree / Resistance band standard](https://calistree.app/knowledge?id=resistanceBandStandard)<br>観察: J04 |
