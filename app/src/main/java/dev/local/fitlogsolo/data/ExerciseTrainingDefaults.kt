package dev.local.fitlogsolo.data

data class ExerciseTrainingDefault(
    val weightStepKg: Double,
    val tenRepWeightKg: Double,
)

/** Default estimates for the six exercises shipped in the gym and home presets. */
fun exerciseTrainingDefault(name: String): ExerciseTrainingDefault? = when (name.trim().lowercase()) {
    "ベンチプレス", "bench press" -> ExerciseTrainingDefault(weightStepKg = 2.5, tenRepWeightKg = 55.0)
    "ラットプルダウン", "lat pulldown" -> ExerciseTrainingDefault(weightStepKg = 5.0, tenRepWeightKg = 50.0)
    "レッグプレス", "leg press", "horizontal leg press" -> ExerciseTrainingDefault(weightStepKg = 5.0, tenRepWeightKg = 105.0)
    "スクワット", "squat" -> ExerciseTrainingDefault(weightStepKg = 2.5, tenRepWeightKg = 72.5)
    "腕立て伏せ", "push-up", "push ups" -> ExerciseTrainingDefault(weightStepKg = 2.5, tenRepWeightKg = 0.0)
    "プランク", "plank" -> ExerciseTrainingDefault(weightStepKg = 2.5, tenRepWeightKg = 0.0)
    else -> null
}
