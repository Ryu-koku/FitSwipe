package dev.local.fitlogsolo.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kotlin.math.sqrt

/** Fixed bench and torso; equal-length arm segments bend as the weights travel upward. */
@Composable
internal fun InclinePressPictogram(modifier: Modifier = Modifier) {
    val extension by rememberInfiniteTransition(label = "incline press")
        .animateFloat(
            initialValue = 0f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(1400), RepeatMode.Reverse),
            label = "press extension",
        )
    Canvas(
        modifier.fillMaxSize().padding(4.dp).semantics {
            contentDescription = "インクラインダンベルプレス：ベンチに体を固定し、肘を曲げて下ろし、ダンベルを上へ押し上げる動作"
        },
    ) {
        val unit = minOf(size.width, size.height) / 100f
        val ink = Color(0xFF252932)
        val equipment = Color(0xFF858991)
        // Use a square coordinate system so joints and weights keep their proportions.
        scale(unit, unit, pivot = Offset.Zero) {
            val dx = (size.width / unit - 100f) / 2f
            val dy = (size.height / unit - 100f) / 2f
            fun point(x: Float, y: Float) = Offset(x + dx, y + dy)
            fun line(a: Offset, b: Offset, color: Color, width: Float) =
                drawLine(color, a, b, width, StrokeCap.Round)
            line(point(25f, 43f), point(55f, 76f), equipment, 5f)
            line(point(53f, 77f), point(71f, 77f), equipment, 5f)
            line(point(43f, 65f), point(29f, 91f), equipment, 3f)
            line(point(61f, 79f), point(74f, 91f), equipment, 3f)
            line(point(24f, 92f), point(79f, 92f), equipment, 3f)
            // Head, torso, hips and planted feet stay still for the entire repetition.
            drawCircle(ink, 7f, point(29f, 34f))
            line(point(36f, 46f), point(58f, 70f), ink, 12f)
            line(point(58f, 70f), point(76f, 72f), ink, 10f)
            line(point(76f, 72f), point(82f, 88f), ink, 8f)
            line(point(81f, 89f), point(91f, 89f), ink, 5f)
            line(point(39f, 47f), point(48f, 57f), Color(0xFFE64B45), 7f)

            fun arm(shift: Offset, color: Color) {
                val shoulder = point(39f, 47f) + shift
                val hand = point(49f + extension * 5f, 36f - extension * 21f) + shift
                val delta = hand - shoulder
                val distance = delta.getDistance()
                val midpoint = (shoulder + hand) * 0.5f
                val bend = sqrt((18f * 18f - distance * distance / 4f).coerceAtLeast(0f))
                val elbow = midpoint + Offset(delta.y / distance, -delta.x / distance) * bend
                line(shoulder, elbow, color, 6f)
                line(elbow, hand, color, 5f)
                drawCircle(color, 3f, elbow)
                line(hand + Offset(-8f, 0f), hand + Offset(8f, 0f), color, 3f)
                line(hand + Offset(-7f, -4f), hand + Offset(-7f, 4f), color, 4f)
                line(hand + Offset(7f, -4f), hand + Offset(7f, 4f), color, 4f)
            }
            arm(Offset(-5f, -3f), Color(0xFF797F89))
            arm(Offset.Zero, ink)
        }
    }
}
