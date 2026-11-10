# 筋トレ記録アプリのデータ表示調査

確認日: 2026-11-10。担当範囲: 一般的な筋トレ記録アプリ。アプリ変更・外部投稿はしていない。

公開されている公式サイト、公式ヘルプ、開発者のストア説明を検索し、重要なページを実際に開いて本文を確認した。対象は Hevy / Strong / FitNotes Android / JEFIT / GymBook / RepCount / Liftin’ / StrengthLog / StrongLifts / Alpha Progression / FitNotes iOS / Gravitus / HeavySet / Liftosaur / Daptis の15サービス。FitNotes Android と iOS は公式資料も機能も異なるため別扱い。

「確認」は公開資料に表示場所・表示項目の記載があるという意味。全アプリをインストールして現行バイナリを操作した実機検証ではない。機能の存在、数式の妥当性、健康効果はそれぞれ別の問題として扱う。後述の提案は競合の実装確認とは区別した。無料・有料区分は変動し、公式ページ間にも差があるので比較の中心から外した。

## サービス別の特徴と根拠

| サービス | 実際の表示として資料で確認できた特徴 | 読み取れること / 限界 |
|---|---|---|
| Hevy | 前回値を全ワークアウト/同ルーチンで切り替え。種目別実績、回数別重量表、筋別セットと前期間比較、月次レポート。[H1][H2][H3][H4][H5] | 同種目でも順序・ルーチンが違う条件を分けられる。回数別Set Recordと表彰対象PRは別。補助懸垂の重量改善は重量PR対象でない。[H3] |
| Strong | 種目別の履歴/グラフ/回数別実測・予測記録、トレ中のFocus Metric、自由配置ダッシュボード。[S1][S2][S3] | 毎セット重量だけを見る人、量の前回比を見る人で表示を変えられる。ヘルプの一部は2021年更新、Focus Metricは2024年更新。AndroidやWatchの同等性は本文の対象記載以上を断定しない。 |
| FitNotes Android | 回数を固定した重量推移、実測RMと推定RM、推定対象回数の上限、達成条件で絞るカレンダー。[F1][F2][F3] | PRの累積階段と各回の実績線を区別できる。高回数からの過大推定や、縦軸切り詰めによる誇張を扱う設定がある。 |
| JEFIT | セットごとe1RM、筋の配分/回復、目標帯に対する筋力・刺激量・動作バランス、時間の使途。[J1][J2][J3][J4][J5] | 記録を「次に何を調整するか」に変換する。HSEや回復率はベンダーの推定で、実測の筋回復・筋肥大量ではない。FAQはセッションRPEを記録すると説明する一方、HSEは限界への近さも使うと説明し、入力から推定への詳細な対応は非公開。 |
| GymBook | セット行列と進捗、過去ログと線グラフ、反復/荷重による筋ヒートマップ、計画ノートと実績ノート。[G1][G2] | 完了したワークアウトと個別ログを区別。専用RPE/RIR欄はないとFAQに明記、ノートによる目標/実績表示は可能。 |
| RepCount | 種目/カテゴリー/全体の指標、日〜年の集約、移動平均、回数別・年別PR、フォーム・マシン設定のメモ。[R1][R2][R3] | 最大重量、平均重量、回数/セット、頻度でトレーニング様式を読める。repcountapp.com / Siper Apps AB が対象。同名の getrepcount.app の説明を混ぜていない。 |
| Liftin’ | 重量・量・1RM・Training Max・時間の推移、自動進行、次セット/休憩の画面外表示。[L1][L2][L3] | 測定した最大値と計画用の基準重量を分けて扱える。詳細な統計UIは公開ヘルプが少ない。グラフ指標は旧公式紹介ページにも依拠しており、現行UIの完全一致は未検証。 |
| StrengthLog | 同重量の平均回数/回数PR、%1RM/体重比、セット動画、前期間を重ねるグラフ、月年レポート、目的別継続。[T1][T2][T3][T4][T5][T6] | 過去の最高値だけでなく「いつもの自分」と比較する設計。主観の睡眠/ストレス等も保存できるが、因果分析表示の存在まではその入力機能から推認していない。 |
| StrongLifts | 完了/未達/未実施/0回の差、次回重量、復帰時の減量率と具体重量、3種目Total、体重7日平均。[SL1][SL2][SL3] | 結果→次回計画のつながりが明確。e1RMはセットRPEを入力できず条件から仮定する旨を公式に明記。Totalは代替種目も含められるため、競技Totalと常に同義ではない。 |
| Alpha Progression | セットごとe1RM/e10RM/量、実在する重量に合わせた推奨、前回ノート、種目適性、部位セットと身体の推移。[A1][A2][A3] | 予定回数・推奨回数・実績は別。重量が軽くなっても回数やRIRを含めたパフォーマンスは改善し得る。種目適性評価や体重寄与率はアプリ側のモデル。 |
| FitNotes iOS | 任意期間のPR、全期間PRとの色分け、最大10種目の同一グラフ、比較プリセット、Training Max履歴。[FI1][FI2] | 復帰期/トレーニング周期のPRと生涯PRを両立できる。Android版へそのまま当てはめない。 |
| Gravitus | 次のPRに必要な回数、STRAIN/MAX/TRENDツール、PR差分と相対順位。[V1][V2] | 休憩中に次の挑戦を判断する。STRAIN/TRENDの詳細算式は未確認。公式トップの画像は代替テキストまで確認し、画像ファイル自体はwebツールが形式エラーで開けなかった。順位変化の細部は公式画像説明に基づく。 |
| HeavySet | 過去から次セットの値を予測、現在の回数記録と記録更新の全履歴、強度/Training Maxを使う計画。[HS1] | 「今のベスト」と「そこまでの道のり」を別に見られる。公式の詳細ヘルプ公開範囲が狭く、第三者転載ストア説明だけにあった細部は採用しなかった。 |
| Liftosaur | 現在/前回/同日/ベスト、目標重量の丸め理由、週の部位量・頻度の目標帯、プログラム境界入りグラフ、計画シミュレーター。[O1][O2][O3][O4][O5][O6] | 計画と実績を同じ集計定義で比較できる。8回未満=Strength、8回以上=Hypertrophyはサービス内の分類であり、生理学的な境界と断定しない。APIに返る項目だけをアプリ表示と見なしていない。 |
| Daptis | top5セット/種目、同じ計画のセット別比較、初回を基準とするPR、データ不足時にサンプルと明示。[D1] | 初回から「新記録」を大量発生させず、少数データを実測線に見せない。公開の早期アクセス製品説明に基づき、成熟製品と運用実績を同列評価していない。 |

## 固有のデータ表示アイデア一覧

以下は細部を含む表示候補。個別の色やグラフ形式だけを別アイデアとして数えず、見せる事実・比較基準・判断が変わる単位で整理した。「競合確認」は公開資料から確認、「提案」はこの調査からの推論。

### セット前・セット中の判断

| ID | 表示するデータ / 単位・文脈 | 判断できること | 競合確認 |
|---|---|---|---|
| C01 | 各セット行に前回の重量×回数と日付 | 今回の入力と比較すべき出発点 | Hevy [H1]、Liftosaur [O1] |
| C02 | 「全履歴の直近」「同じルーチンの直近」を切替 | 種目順や疲労条件が近い比較か | Hevy [H1] |
| C03 | 多週プログラムの同じ日・同じセット位置の履歴 | 週をまたぐ同条件での進行 | Liftosaur [O1] |
| C04 | 現在のセットに対応した過去ベスト/Best AMRAP | どこまで達成すれば記録か | Liftosaur [O1] |
| C05 | 計画の重量・回数・RPE/RIRと実績を併記 | 計画通りか、予定以上に追い込んだか | Alpha [A1]、GymBookのノート [G2] |
| C06 | 同じ重量における平均回数と回数PR | 重量を上げなくても「いつもより良い」か | StrengthLog [T1] |
| C07 | セットごとのe1RM/e10RM/量を選択表示 | 重量と回数が異なるセットの目安比較 | Alpha [A1] |
| C08 | その重量が自己1RMの何%か | 今日のセットの相対強度 | StrengthLog [T1] |
| C09 | セット重量が自分の体重の何倍か | 体格に対する荷重の大きさ | StrengthLog [T1] |
| C10 | 自己maxを基準としたSTRAINのゾーン | 次セットが軽い/重い領域か | Gravitus [V1] |
| C11 | PRを超えるのに必要な回数 | 次セットの具体的な挑戦目標 | Gravitus公式画像説明 [V1] |
| C12 | 今日ここまでの結果を反映した次セット推奨 | 疲労や予想外の好不調への調整 | Alpha [A2][A3] |
| C13 | 次に実在する重量までの刻みと代替回数 | 増量が大き過ぎるなら先に回数を増やすか | Alpha [A2][A3] |
| C14 | 理論目標重量→実際に組める重量と丸め理由 | なぜ計画値と表示重量が違うか | Liftosaur [O1] |
| C15 | 左右それぞれのプレート構成 | 今から何を装着するか | Liftin’ [L1]、Liftosaur [O1] |
| C16 | ウォームアップの段階別重量×回数 | 作業セットまでどう準備するか | Liftin’ [L1]、Alpha [A1] |
| C17 | その種目の今回ノート/ピン留めノート/前回ノート | マシン座席やフォーム条件を再現できるか | Alpha [A1]、RepCount [R1] |
| C18 | 種目共通、特定ルーチン内、今回セットのメモを区別 | 恒常条件と当日の出来事の区別 | GymBook [G2]、StrengthLog [T1] |
| C19 | セット完了数/予定数と未実施箇所 | 残りの作業、飛ばした箇所 | GymBook [G1]、Liftosaur [O1] |
| C20 | 目標未達、未実施、挑戦して0回を別状態で表示 | 失敗とスキップを混同しない | StrongLifts [SL2] |
| C21 | 休憩残りだけでなくゼロ後の超過時間 | 実際に何分休んだか | Alpha [A1] |
| C22 | 種目ごとに選ぶFocus Metric（量の前回比%など） | 自分の目的の指標をトレ中に追える | Strong [S2] |
| C23 | ロック画面/通知に今の種目・セット・推奨・休憩 | 端末を開かず次の行動を理解 | Alpha [A1]、Liftin’ [L1] |

### PR・強さ・自己比較

| ID | 表示するデータ / 単位・文脈 | 判断できること | 競合確認 |
|---|---|---|---|
| C24 | 最重量・e1RM・1セット量・1回の種目合計量を別PRに | 何が改善した記録なのか | Hevy [H3] |
| C25 | 1回・3回・5回・8回等、回数別に最重量を並べる | 自分が鍛えている回数帯の進歩 | Hevy [H3]、Strong [S1] |
| C26 | 実測RM表と式による予測RM表を切替 | 実際に挙げたものと推測の分離 | FitNotes Android [F1] |
| C27 | 高回数で達成した重量が低回数RMも満たす場合を淡く表示 | 実測その回数の記録か、上位記録からの包含か | FitNotes Android [F1] |
| C28 | PRに元セットと達成日を付け、元ワークアウトへ移動 | 数値の根拠と当日の条件 | Hevy [H2]、Liftosaur [O3] |
| C29 | 現在PRだけでなく、同回数PRの更新履歴 | 停滞期間や改善の階段 | FitNotes iOS [FI1]、HeavySet [HS1] |
| C30 | 全期間PR、今年PR、任意期間PRを別に保持 | 復帰期や周期内での成功 | RepCount [R2]、FitNotes iOS [FI1] |
| C31 | 同じセットが期間PRかつ全期間PRであることを色で表示 | 小さな成功と生涯最高の関係 | FitNotes iOS [FI1] |
| C32 | 種目全期間top5セットと最近のセット | 最高一発だけに依存しない実力把握 | Daptis [D1] |
| C33 | PRを実施セットに付け、終了後にまとめる | 運動中の達成感と後の振り返り | Hevy [H3]、JEFIT [J1] |
| C34 | 初回は基準記録として扱い、更新PR扱いしない | 初回祝いと本当の改善の区別 | Daptis [D1] |
| C35 | 自重は最大回数、等尺保持は最長時間など種目別PR | 運動に合った達成基準 | Hevy [H3][H4] |
| C36 | 推定1RM計算の元セット・式・対象回数上限 | 指標の信頼できる範囲 | FitNotes [F1]、StrongLifts [SL1] |
| C37 | 実挙上重量線とe1RM線を同時表示 | 予測値上昇と本当の使用重量上昇の差 | Liftosaur [O3] |
| C38 | Training Maxの履歴を通常1RMと分ける | 計画基準を保守的にした変更か、実力変化か | Liftin’ [L2]、FitNotes iOS [FI2] |
| C39 | Squat+Bench+DeadliftのTotal | 主要3種目を合わせた進歩 | StrongLifts [SL1] |
| C40 | 同年齢・体重・性別群の筋力レベル | 似た条件の利用者の中での位置 | Hevy [H2] |
| C41 | 集団分布上の位置、パーセンタイルとその変化 | 今回のPRが相対的位置にどう影響したか | Gravitus [V1][V2] |
| C42 | e1RM÷体重の経時推移 | 増量/減量中の相対筋力の変化 | RepCount [R3] |

### 経時変化と比較の条件

| ID | 表示するデータ / 単位・文脈 | 判断できること | 競合確認 |
|---|---|---|---|
| C43 | 8回など回数を固定した各回の最重量の線 | 同じ回数で実際に増量したか | FitNotes [F1] |
| C44 | 最大重量、平均重量、総回数、1セット平均回数の推移 | 強度が上がったか、回数帯を変えたか | RepCount [R3] |
| C45 | 日々の実績線と移動平均/傾向線 | 日差に埋もれた長期方向 | RepCount [R1][R3]、FitNotes [F1] |
| C46 | グラフに伸びているかの判定と変化量 | グラフを読めない人も方向を把握 | Gravitus TREND [V1] |
| C47 | 同じ長さの直前期間を重ねるグラフ | 最近28日など、期間を揃えた比較 | StrengthLog [T3]、Hevy [H5] |
| C48 | 月/年の回数・量・セット等の前期差分と平均 | 生活や計画変更後の実行量 | StrengthLog [T4] |
| C49 | 期間内最小/最大e1RMと総量 | 最も良い日だけでない変動幅 | JEFIT [J2] |
| C50 | 種目、部位、全体で切替え、日/週/月/年集約 | 詳細から全体へ同じ問いを広げる | RepCount [R1][R3] |
| C51 | 複数種目を同一図に重ね、組合せをプリセット化 | 複数の主要種目が同時に伸びているか | FitNotes iOS [FI2] |
| C52 | 複数グラフの横軸期間を統一 | 違う開始時期の線を誤比較しない | Liftosaur [O3] |
| C53 | プログラム変更日の縦線と名称 | どの計画を行っていた時期の変化か | Liftosaur [O3] |
| C54 | グラフ上の点に当日のメモ/プログラム状態を表示 | 好不調や設定変更の文脈 | Liftosaur [O3] |
| C55 | グラフから実施順を含む当日の全セッションへ移動 | 後半に回したため落ちたのかを確認 | Hevy [H2] |
| C56 | 100kg×5回以上などの条件で日付を絞るカレンダー | 特定の水準を達成した日はいつか | FitNotes [F2] |
| C57 | 同じ計画の各実施回をセット単位で比較 | 同じメニューの再現性/改善 | Daptis [D1] |
| C58 | ゼロ起点/自動範囲の縦軸と点選択 | 小さな上下を誇張せず読む | FitNotes [F1] |

### 部位・動作・量・頻度

| ID | 表示するデータ / 単位・文脈 | 判断できること | 競合確認 |
|---|---|---|---|
| C59 | 部位別の週セット数と前期間 | 鍛えたい部位への量が増えたか | Hevy [H5][H6] |
| C60 | 主働筋1/副働筋0.5などを反映した寄与セット | 複合種目が複数部位へどう加算されたか | Hevy [H6]、Liftosaur [O2] |
| C61 | 筋別セット数を開くと寄与種目・内訳 | なぜ胸が12セットなのか | Liftosaur [O2] |
| C62 | 筋別セットの下限〜上限、現状値、増減矢印 | 今週その部位を追加/削減するか | Liftosaur [O2] |
| C63 | 部位ごとのトレーニング日数と頻度目標 | 同量を一度に集中/複数日に分散したか | Liftosaur [O2] |
| C64 | 週内の刺激量累計を個人目標帯に重ねる | 週の途中でどこまで実行したか | JEFIT HSE [J3] |
| C65 | 部位ごとの刺激量の現在/目標値 | 次にどの筋へ作業を配分するか | JEFIT [J3] |
| C66 | 低回数/高回数セットの数と構成比 | 重め・回数多めの作業配分 | Liftosaur [O2] |
| C67 | 上半身/下半身/体幹/Push/Pull/Legs別のセット | 部位とは別の動作群で偏りを見る | Liftosaur [O2] |
| C68 | 垂直Push/Pull、水平Push/Pull、Squat/Hingeの比率 | 対向する動作パターンの不足 | JEFIT [J3] |
| C69 | 筋全体→広背筋/中部背筋/下背部等の配分% | 「背中の日」の中で何をしているか | JEFIT BodyMap [J4] |
| C70 | 実施部位の前後ボディマップを週別に表示 | 未実施部位を直感的に見つける | Hevy [H5] |
| C71 | 筋回復の推定率と残り時間 | 部位選択の参考、休ませる部位 | JEFIT [J5] |
| C72 | 同じボディ図でも「配分」と「推定回復」を分ける | たくさん実施した事実と回復推定の区別 | JEFIT [J4][J5] |
| C73 | 種目/部位の使用頻度ランキング | 特定種目への依存、最近使っていない種目 | Hevy [H5]、RepCount [R3] |
| C74 | 作る前の週プログラムの部位量・日数 | 実施前に偏りを修正 | Liftosaur Web Editor [O4] |
| C75 | 計画の週ごと量・強度の推移 | ピークや軽い週を含めた周期構成 | Liftosaur [O4] |

### セッション・身体・継続・データの状態

| ID | 表示するデータ / 単位・文脈 | 判断できること | 競合確認 |
|---|---|---|---|
| C76 | 終了直後に時間・量・セット・PR・部位・主観RPE | 今日の作業と主観をまとめて振り返る | JEFIT [J1] |
| C77 | 実動・休憩・器具準備/調整の時間内訳 | 長時間の理由、短縮できる箇所 | JEFIT [J1] |
| C78 | 未完の週には前週比較を出さず、終了週だけ差分 | 週途中を「減った」と誤認させない | Liftosaur [O2] |
| C79 | 週実施回数/目標と週単位継続 | 生活に合った頻度を守れたか | Strong [S3]、StrengthLog [T5] |
| C80 | 特定種目・部位の回数/量/セットの継続目標 | 自分固有の習慣が続いているか | StrengthLog [T5] |
| C81 | 現在/最長継続、達成日、未達の日と不足量 | 長期継続と躓いた箇所 | StrengthLog [T5] |
| C82 | 日付に実施部位の色を重ねるカレンダー | 休み日を含む実施配列 | FitNotes [F2] |
| C83 | 体重の原値と7日平均 | 水分等の日差から長期変化を分ける | StrongLifts [SL1] |
| C84 | 挙上グラフに体重を重ねる | 増減量とパフォーマンス変化が同時か | Liftosaur [O3] |
| C85 | 身体周囲径・体脂肪など選んだ測定の推移 | 見た目の目標と力の進歩を併せて見る | GymBook [G1]、Alpha [A1] |
| C86 | 日付付き進捗写真を2時点比較 | 数値に出ない見た目の変化 | Hevy [H2] |
| C87 | セット動画と種目・重量・日付を結びつけて一覧 | 数値の条件やフォームを後で確認 | StrengthLog [T2] |
| C88 | 初回の前回欄は空白、履歴不足の推奨は非表示 | 未記録をゼロ・低実力と誤認しない | Hevy [H1]、Alpha [A3] |
| C89 | 2回未満のグラフをサンプルと明示/初期案内 | 実データが足りない事実と次の操作 | Daptis [D1]、Liftosaur [O3] |
| C90 | 使いたい指標だけホームへ配置・並替え | 目的に不要な指標を毎回読まない | Strong [S3]、Liftosaur [O3] |
| C91 | 個人記録・月次レポート・継続を画像化 | 他人へ説明できる達成の形 | Hevy [H2]、StrengthLog [T4][T5] |
| C92 | 復帰カードに推奨減量率と再開する具体重量 | 久しぶりの運動の再開地点 | StrongLifts [SL3] |
| C93 | 成功/失敗の仮入力後、次回重量や回数をシミュレーション | 自動進行ルールを採用前に理解 | Liftosaur Playground [O5] |
| C94 | 集計ルール（WU含む/除外、片側倍算、補助重量控除） | 数字の定義が違う比較を避ける | Hevy [H4][H6]、GymBook [G2]、StrengthLog [T6] |
| C95 | 秒と反復を混ぜた表示の換算前提を明記 | 便宜的な共通単位と実測値の区別 | GymBookは1回≒4秒換算 [G2] |
| C96 | 範囲PRと本当に表彰対象のPRの区別 | 通知が出ない理由を理解 | Hevy [H3] |

## 観察からの提案（競合の実装確認とは別）

1. **運動中は「次を決める情報」を最優先にする。** 前回の同条件セット、今日の目標、重量刻み、直前のRIR、PRまであと何回を近くに置く。e1RMや累積トン数を常時大きくするより、次のセットの具体的な判断へつなげる。
2. **「重くなった」以外の改善を認める。** 同重量で+1回、同回数で+2.5kg、同重量・回数でRIRが+1、休憩を揃えてセット後半の回数減少が小さくなった等を候補にする。最後の2つは本調査で広く標準表示を確認できたものではなく、入力データを使う提案。
3. **比較条件をデータに含める。** 種目IDだけでなく器具、マシン個体、片側/両側、可動域、補助、ルーチン、種目順、セット種別を保管し、可能なら同条件を優先。競合ではノート/カスタム種目で対処する例が多く、完全自動で揃えて比較する存在は未確認。
4. **事実とモデルを見た目で分ける。** 実測PR、e1RM、部位配分、HSE、筋回復は確度が違う。原セットへ戻れる導線、推定ラベル、計算対象外の理由を付ける。推定回復率を痛みの判断やトレーニング可否の保証に使わない。
5. **週の途中の比較を丁寧にする。** 完了週対完了週、今週ここまで対先週の同曜日まで、直近28日対その前28日を使い分ける。単に期間だけを選ばせず、比較の分母を表示する。
6. **部位マップの「赤いほど良い」を避ける。** 主働/副働の内訳、週の目標帯、頻度、本人の優先部位を用い、十分ならそこで止められる表示にする。小筋群や個人差へ一律の正解セット数を断定しない。
7. **初回・復帰・欠測を一級の画面状態にする。** 初回の基準作成、2回目からの比較、長期休止後の期間PR、体重未入力時に自重種目の量を計算できない理由、機器変更後の別基準を見せる。
8. **ホームには一つの次の行動と小さな成果。** 今週目標の残り、次回メニュー、直近の改善、必要な部位量を優先し、全データの探索は詳細へ。96候補を一画面へ全部置く提案ではない。

## 集計の定義を揃えないと誤る点

- **部位セット**: Hevy公式は主働筋1・副働筋0.5、WUを含む。[H6] GymBookはWU/クールダウンを統計・ヒートマップ・サマリーから除外する。[G2] Liftosaurは副働係数をユーザーが変えられる。[O2] 同じ「胸12セット」でも同一指標とは限らない。
- **自重の量**: Hevyはライブラリ中の特定の全体重種目のみ体重を加算し、補助は控除する。カスタム自重種目は体重を量へ足さない。[H4] Alphaは種目ごとの体重寄与率を使い、カスタム種目で指定する。[A1] したがってトン数のアプリ間比較には定義が必要。
- **片側種目**: StrengthLogは片側入力から体積を2倍換算して両側種目へ合わせる設計。[T6] 入力欄に書いた重量と集計した重量を説明する必要がある。
- **e1RM**: StrongLiftsは12回超を表示せず、RPEはセットから仮定する。[SL1] Liftosaurは未記録RPEを10と仮定する。[O1] FitNotesは対象レップ上限を調整できる。[F1] 数式や努力の前提が違えば同じ重量×回数でも値が違う。
- **完了と履歴**: GymBookのカレンダーは完了したワークアウトが対象で、未完でもログ自体は別画面に残る。[G2] 「カレンダーにない=データがない」ではない。
- **累計と内訳**: Liftosaurは副働の小数を内訳ごとに丸めるため、表示する筋力/肥大の和が総数と一致しない場合を説明する。[O2] 丸めや小数の扱いもデータ表示の一部。

## 探索の反復と到達範囲

1巡目は指定10サービスの公式トップ/統計/ヘルプを横断。前回値、PR、e1RM、量、筋配分、頻度、継続、身体、共有、次回目標という基本系統を得た。

2巡目は「何を元に計算するか」「回数別の記録」「同条件」「初回」「休止後」「WU」「時間の内訳」「CSV/API」の深層を探索。FitNotes iOS、Gravitus、HeavySet、Liftosaur、Daptisを追加した。新しく増えた系統は、計算過程/集計条件の説明、計画の仮実行、表示データ不足の扱い、動作パターンの目標帯、実動/器具準備の分解。新しく増えた具体表示は、任意期間PR、必要回数、STRAIN、体重重ね線、プログラム変更線、top5セット、同計画のセット別比較など。

3巡目は `RepCount charts average bodyweight`、`GymBook assistant weight`、`Gravitus strain trend`、`Liftosaur simulate`、FitNotesのチャート/カレンダー深層、StrongのFocus Metric、StrongLiftsの復帰/失敗判定を再探索。**新しい上位の表示系統は増えず**、既存系統内の具体差分（複数種目プリセット、比較横軸の統一、未完週の差分抑制、復帰時の具体重量、同名別アプリの混入防止）が増えた。RepCountの英語ヘルプで再確認し、同名製品の検索結果は除外した。

APIでは Liftosaur の program-stats の日別推定時間、週部位セット、strength/hypertrophy、部位の週頻度、寄与種目を確認。[O6] これらはWeb Editor/Week Insightsの公式説明で表示も裏付けられる範囲だけをカタログに採用した。APIが返すだけの値を表示確認済みへ格上げしていない。Hevy/Strong等のCSVを使う外部分析アプリも検索結果に出たが、競合自身の表示と混同しなかった。

「世界中にこれ以上の表示がない」ことは公開Web調査では証明できない。ここでの飽和は、対象15サービスとその公式深層において、新しい画面系統ではなく既存系統の組合せ・粒度・条件差が中心になったという意味。実機だけの機能、段階配信、地域差、A/Bテスト、企業向けダッシュボードの全容は残る。

## 出典（URL単位の短い根拠）

公開ページは全て2026-11-10に開いて確認。検索スニペットだけを根拠にした未確認機能は本文へ採用していない。各ページの短い要約にとどめ、長い原文引用はしていない。

| 記号 | 公式資料 | 確認した範囲 |
|---|---|---|
| H1 | [Previous Workout Values](https://www.hevyapp.com/features/track-exercises/) | 同ルーチン/任意ワークアウト、前回値の表示場所、初回空白、追加セットの欠測。 |
| H2 | [Gym Progress](https://www.hevyapp.com/features/gym-progress/) | 種目記録、元ワークアウト、身体と写真比較、月次、相対筋力。 |
| H3 | [Set Records vs Personal Records](https://help.hevyapp.com/hc/en-us/articles/38279531346455-Set-Records-vs-Personal-Records) | 回数別重量表とPR通知の差、種目タイプ別のPR。 |
| H4 | [Bodyweight vs Assisted vs Weighted](https://help.hevyapp.com/hc/en-us/articles/44098622782487-Bodyweight-Exercises-in-Hevy-Bodyweight-vs-Assisted-vs-Weighted) | 自重と補助/加重の量、特定ライブラリ種目のみ体重計上。加重例に誤植があり、式の一般説明を採用。 |
| H5 | [Statistics Explained](https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth) | 部位セット、直前期間との分布比較、週別ボディ図、よく使う種目。 |
| H6 | [How Sets per Muscle Group Works](https://help.hevyapp.com/hc/en-us/articles/44128140257431-How-Does-Sets-per-Muscle-Group-Work) | 主働筋1、副働筋0.5、WUを含む、全体期間と集約間隔。 |
| S1 | [Exercise Detail](https://help.strongapp.io/article/237-about-exercise-detail) | 履歴、種目別グラフ、回数別最高と予測。2021-02-08更新。 |
| S2 | [Focus Metric](https://help.strongapp.io/article/226-focus-metric) | トレ中の種目別指標選択と前回比%。2024-09-20更新。 |
| S3 | [Profile Widgets](https://help.strongapp.io/article/239-profile-widgets) | 週目標、任意種目/測定/栄養のウィジェット、並べ替え。 |
| F1 | [FitNotes Progress Tracking](https://www.fitnotesapp.com/progress_tracking/) | 回数固定重量線、RM線、実測/推定、包含PR、上限レップ、グラフの根拠と軸。 |
| F2 | [FitNotes Calendar](https://www.fitnotesapp.com/calendar/) | 部位色、条件付き履歴、複数カテゴリーのAND/OR。 |
| F3 | [FitNotes Version 24](https://www.fitnotesapp.com/release_24/) | 年別比較、任意期間、先頭/末尾セット表示、種目別kg/lbと変換選択。 |
| J1 | [JEFIT FAQ](https://www.jefit.com/support/faq) | 終了サマリー、RPE、Insightsの時間内訳、履歴、次回提案。 |
| J2 | [JEFIT 1RM Tracking](https://www.jefit.com/features/one-rep-max) | セットe1RM、期間の最小/最大/量、全種目横断の上昇/維持/下降。 |
| J3 | [JEFIT Progress Index](https://www.jefit.com/features/progress-index) | 3つの目標帯、HSE、部位の達成/目標、6動作の対比、軽い週の文脈。 |
| J4 | [JEFIT BodyMap](https://www.jefit.com/features/bodymap) | 部位の配分%、筋群内訳、計画/終了画面、筋を選び種目追加。 |
| J5 | [JEFIT Muscle Recovery](https://www.jefit.com/features/muscle-recovery) | 回復の図・推定率・時間、ログの負荷と経過から算出する説明。 |
| J6 | [JEFIT Analysis Guide](https://www.jefit.com/blog/jefit-training-analysis-guide) | 各分析の表示場所、無料/Eliteの位置付け。公開日は2026-11-06。 |
| G1 | [GymBook](https://gymbookapp.com/) | セット行列、過去ログ、筋ヒートマップ、身体指標、線/円グラフ。 |
| G2 | [GymBook FAQ](https://gymbookapp.com/faq) | 目標/実績ノート、未完ログ、WU除外、秒と回数の換算。 |
| R1 | [RepCount Features](https://www.repcountapp.com/features) | 前回とノート、期間/集約/トレンド、機器設定、回数別PR。 |
| R2 | [RepCount Premium](https://support.repcountapp.com/article/50-what-is-included-in-repcount-premium) | 年別Seasonal Best、セッション最多回数/セット等。2025-05-10更新。 |
| R3 | [RepCount Chart Guide](https://support.repcountapp.com/article/35-how-do-i-make-the-most-out-of-the-charts) | e1RM/体重、量、最大/平均重量、回数/セット、部位/種目頻度。2026-09-23更新。 |
| L1 | [Liftin’](https://liftinapp.co/) | 自動進行、RPE/RIR目標、プレート、WU、現在セット/休憩。 |
| L2 | [Liftin’旧公式紹介](https://liftin-workout-app.squarespace.com/) | Weight/Volume/1RM/Training Max/Timeのグラフ。旧サイトなので現行差異を留保。 |
| L3 | [Liftin’開発者App Store説明](https://apps.apple.com/us/app/liftin-gym-workout-tracker/id1445041669) | 短長期グラフ、自動重量調整、プラットフォームの補助確認。 |
| T1 | [StrengthLog Logging](https://help.strengthlog.com/help-article/how-to-record-a-workout/) | セットQuick Stats、%1RM/体重比/同重量平均回数、メモ。2026-10-13更新。 |
| T2 | [StrengthLog Video Library](https://help.strengthlog.com/help-article/using-the-video-library/) | セット動画と重量/日付/種目の表示、種目で検索、PRへの添付。 |
| T3 | [StrengthLog Home](https://help.strengthlog.com/help-article/the-home-screen/) | 同じ長さの直前期間を灰色で重ねる、任意グラフをホームへ。 |
| T4 | [StrengthLog Reports](https://help.strengthlog.com/help-article/training-reports/) | 月/年の実績・平均・PR・前期差分・共有。2025-07-01更新。 |
| T5 | [StrengthLog Streaks](https://help.strengthlog.com/help-article/streaks/) | 週/日、回数/量/セット/実施数、現在/最長/未達量の表示。 |
| T6 | [StrengthLog One-sided Exercises](https://help.strengthlog.com/help-article/one-sided-exercises/) | 片側入力と2倍換算、集計の比較可能性。 |
| SL1 | [StrongLifts Graphs](https://support.stronglifts.com/article/89-graphs) | Total、体重7日平均、e1RMの対象回数/RPE仮定、Favorites。 |
| SL2 | [StrongLifts Logging Sets](https://support.stronglifts.com/article/212-log-sets) | 完了/目標未達/未実施/0回の丸表示、失敗時休憩。2026-10-17更新。 |
| SL3 | [StrongLifts Progression](https://support.stronglifts.com/article/71-progression) | 成功/反復失敗→次回重量、Welcome Backの減量率と重量。2026-10-07更新。 |
| A1 | [Alpha Complete Guide](https://alphaprogression.com/en/blog/alpha-progression-guide) | セット指標、ノート、休憩超過、身体寄与率、種目評価、グラフ。 |
| A2 | [Alpha Recommendations](https://alphaprogression.com/en/blog/alpha-progression-progression-recommendations) | 現在セット・過去・予定・実在重量からの次セット推薦。 |
| A3 | [Alpha Progression glossary](https://alphaprogression.com/en/glossary/progression-recommendations) | 初回推薦なし、RIR半刻み、任意性、条件差、軽い週。2026-10-02更新。 |
| FI1 | [FitNotes iOS Records](https://www.getfitnotes.com/docs/records.html) | 任意日付範囲PR、全期間との色区別、更新履歴。 |
| FI2 | [FitNotes iOS Charts](https://www.getfitnotes.com/docs/stats-graphs-and-charts.html) | 最大10種目・比較プリセット・回数固定グラフ・Training Max。 |
| V1 | [Gravitus](https://gravitus.com/) | MAX/STRAIN/TREND、PR条件、相対順位。画像細部は代替テキストの確認。 |
| V2 | [Gravitus Pro](https://gravitus.com/pro/) | 筋利用統計、Rep/Max推定、強度分析、グラフ履歴。 |
| HS1 | [HeavySet](https://heavyset.app/) | Smart Values、現在回数記録と全履歴、Training Max。 |
| O1 | [Liftosaur Workout](https://api3.liftosaur.com/features/workout-screen) | Last/Best/Same day、丸め理由、e1RMの仮定、完了数、前回ノート。 |
| O2 | [Liftosaur Week Insights](https://www.liftosaur.com/features/week-insights) | 週目標帯/頻度、内訳、未完週比較抑制、丸め、副働係数、部位編集。 |
| O3 | [Liftosaur Graphs](https://www.liftosaur.com/features/graphs) | 体重重ね線、共通横軸、プログラム境界、元セット/メモ/状態、空状態。 |
| O4 | [Liftosaur Web Editor](https://www.liftosaur.com/features/web-editor) | 計画段階の部位量・頻度、寄与内訳、週の量/強度。 |
| O5 | [Liftosaur Playground](https://www.liftosaur.com/features/playground) | 成功/失敗を仮入力、次回の重量/回数/状態を表示。 |
| O6 | [Liftosaur API公式ソース](https://github.com/astashov/liftosaur/blob/master/docs/content/api.md) | program-statsの推定時間、部位セット/頻度/寄与種目。API項目とアプリ表示を分離。 |
| D1 | [Daptis Progress](https://www.daptis.app/features/progressive-overload-tracking) | top5、同計画比較、初回基準、サンプルの明示、推定上限。 |

[H1]: https://www.hevyapp.com/features/track-exercises/
[H2]: https://www.hevyapp.com/features/gym-progress/
[H3]: https://help.hevyapp.com/hc/en-us/articles/38279531346455-Set-Records-vs-Personal-Records
[H4]: https://help.hevyapp.com/hc/en-us/articles/44098622782487-Bodyweight-Exercises-in-Hevy-Bodyweight-vs-Assisted-vs-Weighted
[H5]: https://help.hevyapp.com/hc/en-us/articles/35702030346903-Hevy-Statistics-Explained-Track-Your-Training-Progress-and-Muscle-Growth
[H6]: https://help.hevyapp.com/hc/en-us/articles/44128140257431-How-Does-Sets-per-Muscle-Group-Work
[S1]: https://help.strongapp.io/article/237-about-exercise-detail
[S2]: https://help.strongapp.io/article/226-focus-metric
[S3]: https://help.strongapp.io/article/239-profile-widgets
[F1]: https://www.fitnotesapp.com/progress_tracking/
[F2]: https://www.fitnotesapp.com/calendar/
[F3]: https://www.fitnotesapp.com/release_24/
[J1]: https://www.jefit.com/support/faq
[J2]: https://www.jefit.com/features/one-rep-max
[J3]: https://www.jefit.com/features/progress-index
[J4]: https://www.jefit.com/features/bodymap
[J5]: https://www.jefit.com/features/muscle-recovery
[G1]: https://gymbookapp.com/
[G2]: https://gymbookapp.com/faq
[R1]: https://www.repcountapp.com/features
[R2]: https://support.repcountapp.com/article/50-what-is-included-in-repcount-premium
[R3]: https://support.repcountapp.com/article/35-how-do-i-make-the-most-out-of-the-charts
[L1]: https://liftinapp.co/
[L2]: https://liftin-workout-app.squarespace.com/
[L3]: https://apps.apple.com/us/app/liftin-gym-workout-tracker/id1445041669
[T1]: https://help.strengthlog.com/help-article/how-to-record-a-workout/
[T2]: https://help.strengthlog.com/help-article/using-the-video-library/
[T3]: https://help.strengthlog.com/help-article/the-home-screen/
[T4]: https://help.strengthlog.com/help-article/training-reports/
[T5]: https://help.strengthlog.com/help-article/streaks/
[T6]: https://help.strengthlog.com/help-article/one-sided-exercises/
[SL1]: https://support.stronglifts.com/article/89-graphs
[SL2]: https://support.stronglifts.com/article/212-log-sets
[SL3]: https://support.stronglifts.com/article/71-progression
[A1]: https://alphaprogression.com/en/blog/alpha-progression-guide
[A2]: https://alphaprogression.com/en/blog/alpha-progression-progression-recommendations
[A3]: https://alphaprogression.com/en/glossary/progression-recommendations
[FI1]: https://www.getfitnotes.com/docs/records.html
[FI2]: https://www.getfitnotes.com/docs/stats-graphs-and-charts.html
[V1]: https://gravitus.com/
[V2]: https://gravitus.com/pro/
[HS1]: https://heavyset.app/
[O1]: https://api3.liftosaur.com/features/workout-screen
[O2]: https://www.liftosaur.com/features/week-insights
[O3]: https://www.liftosaur.com/features/graphs
[O4]: https://www.liftosaur.com/features/web-editor
[O5]: https://www.liftosaur.com/features/playground
[O6]: https://github.com/astashov/liftosaur/blob/master/docs/content/api.md
[D1]: https://www.daptis.app/features/progressive-overload-tracking
