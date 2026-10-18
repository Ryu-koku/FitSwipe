package dev.local.fitlogsolo.health

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(TextView(this).apply {
            text = "FitLog Soloは、体重グラフを表示するためにHealth Connectの体重読み取り権限だけを使用します。データは端末内で処理し、外部へ送信しません。"
            setPadding(48, 48, 48, 48)
        })
    }
}
