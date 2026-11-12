# プレミアム購入のストア設定

月額・買い切りとも RevenueCat の entitlement ID は `premium`。アプリは current offering の標準 Monthly / Lifetime パッケージを取得し、選択されたパッケージを購入します。

1. Play Console で買い切り用の一回限りの商品（非消費型として利用）を作成し、日本の価格を **3,000円** に設定して有効化します。商品 ID は月額とは別にします。
2. RevenueCat に同じ商品 ID を登録し、商品タイプを **Non-consumable** に設定します。消費型にしないでください。
3. 月額商品と同じ `premium` entitlement に紐付けます。
4. current offering に **Lifetime**（`$rc_lifetime`）パッケージを追加し、この商品を割り当てます。既存の Monthly パッケージ・無料体験設定は維持します。
5. RevenueCat キーを設定したストア版ビルドを内部テスト配信し、ライセンステスターで購入・再起動後の権限維持・購入復元を確認します。iOS にも出す場合は App Store Connect に非消費型商品を用意し、同じ entitlement / Lifetime パッケージに割り当てます。

表示価格はストアの `priceString` を使用します（月額未取得時は「月額300円」、買い切り未取得時は「3,000円」）。Lifetime が未設定・未取得の場合、開発版や購入未初期化の場合は買い切りカードを表示しません。無料体験・自動更新の説明は月額選択時のみ表示します。

参照: [RevenueCat の Google Play 商品設定](https://www.revenuecat.com/docs/getting-started/entitlements/android-products)、[非サブスクリプション購入](https://www.revenuecat.com/docs/platform-resources/non-subscriptions)。
