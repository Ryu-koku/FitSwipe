plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.kapt")
}

android {
    namespace = "dev.local.fitlogsolo"
    compileSdk = 36

    defaultConfig {
        applicationId = "dev.local.fitlogsolo"
        minSdk = 28
        targetSdk = 36
        versionCode = 37
        versionName = "2.7.1"
        val roomsUrl = providers.gradleProperty("fitSwipeRoomsUrl")
            .orElse(providers.environmentVariable("FITSWIPE_ROOMS_URL")).getOrElse("")
        require(roomsUrl.isEmpty() || roomsUrl.startsWith("https://") || roomsUrl.startsWith("http://10.0.2.2:") || roomsUrl.startsWith("http://127.0.0.1:"))
        buildConfigField("String", "ROOMS_BASE_URL", "\"${roomsUrl.replace("\\", "\\\\").replace("\"", "\\\"")}\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true
    }

    signingConfigs {
        create("playUpload") {
            val keyPath = providers.environmentVariable("FITLOG_UPLOAD_KEYSTORE").orNull
            if (keyPath != null) {
                storeFile = file(keyPath)
                storePassword = providers.environmentVariable("FITLOG_UPLOAD_PASSWORD").get()
                keyAlias = "fitlog-upload"
                keyPassword = storePassword
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("playUpload")
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.10.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    implementation("androidx.room:room-runtime:2.7.2")
    implementation("androidx.room:room-ktx:2.7.2")
    kapt("androidx.room:room-compiler:2.7.2")

    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")

    testImplementation("junit:junit:4.13.2")
    testImplementation("androidx.room:room-testing:2.7.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.1")
    testImplementation("androidx.arch.core:core-testing:2.2.0")

    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:core:1.6.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
