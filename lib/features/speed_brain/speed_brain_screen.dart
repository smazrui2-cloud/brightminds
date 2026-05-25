import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import 'package:go_router/go_router.dart';

import 'speed_brain_provider.dart';
import 'speed_brain_state.dart';

// ── Neon palette (self-contained) ────────────────────────────
const _kBg1 = Color(0xFF07060F);
const _kBg2 = Color(0xFF0D0B1E);
const _kNeon = Color(0xFFA855F7);
const _kCyan = Color(0xFF22D3EE);
const _kSuccess = Color(0xFF34D399);
const _kError = Color(0xFFF43F5E);
const _kGold = Color(0xFFFBBF24);
const _kSurface = Color(0xFF16143A);
const _kSurfaceLight = Color(0xFF1E1B4B);
const _kBorder = Color(0xFF2A2864);
const _kText = Colors.white;
const _kHint = Color(0xFF7C7CA8);
// ─────────────────────────────────────────────────────────────

class SpeedBrainScreen extends ConsumerStatefulWidget {
  const SpeedBrainScreen({super.key});

  @override
  ConsumerState<SpeedBrainScreen> createState() => _SpeedBrainScreenState();
}

class _SpeedBrainScreenState extends ConsumerState<SpeedBrainScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(speedBrainProvider.notifier).startGame();
    });
  }

  @override
  Widget build(BuildContext context) {
    final game = ref.watch(speedBrainProvider);

    return Scaffold(
      backgroundColor: _kBg1,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [_kBg1, _kBg2, Color(0xFF0F0A1E)],
            stops: [0.0, 0.5, 1.0],
          ),
        ),
        child: SafeArea(
          child: AnimatedSwitcher(
            duration: 550.ms,
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(
                position: Tween(
                  begin: const Offset(0, 0.06),
                  end: Offset.zero,
                ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOut)),
                child: child,
              ),
            ),
            child: game.phase == SpeedBrainPhase.finished
                ? _ResultView(key: const ValueKey('result'), game: game)
                : _GameView(key: const ValueKey('game'), game: game),
          ),
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════
// GAME VIEW
// ════════════════════════════════════════════════════════════

class _GameView extends StatelessWidget {
  const _GameView({super.key, required this.game});
  final SpeedBrainState game;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _TopBar(game: game),
        const Gap(14),
        _ProgressSection(game: game),
        const Gap(22),
        _QuestionCard(game: game),
        const Gap(10),
        AnimatedSwitcher(
          duration: 250.ms,
          child: game.lastWasBonus && game.phase == SpeedBrainPhase.answered
              ? const _BonusBanner(key: ValueKey('bonus'))
              : const SizedBox(key: ValueKey('no-bonus'), height: 36),
        ),
        const Spacer(),
        _AnswerGrid(game: game),
        const Gap(22),
      ],
    );
  }
}

// ── Top bar ──────────────────────────────────────────────────

class _TopBar extends StatelessWidget {
  const _TopBar({required this.game});
  final SpeedBrainState game;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => context.pop(),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: _kSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _kBorder),
              ),
              child: const Icon(Icons.close_rounded, color: _kText, size: 20),
            ),
          ),
          const Gap(14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Speed Brain',
                  style: TextStyle(
                    color: _kText,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                  ),
                ),
                Text(
                  'Q ${game.questionIndex + 1} of ${game.totalQuestions}',
                  style: const TextStyle(color: _kHint, fontSize: 12),
                ),
              ],
            ),
          ),
          _ScoreBadge(score: game.score),
          const Gap(10),
          _TimerBadge(timeLeft: game.timeLeft),
        ],
      ),
    );
  }
}

class _ScoreBadge extends StatelessWidget {
  const _ScoreBadge({required this.score});
  final int score;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _kNeon.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _kNeon.withOpacity(0.35)),
        boxShadow: [
          BoxShadow(color: _kNeon.withOpacity(0.1), blurRadius: 10),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.bolt_rounded, color: _kNeon, size: 15),
          const Gap(4),
          AnimatedSwitcher(
            duration: 200.ms,
            transitionBuilder: (child, anim) =>
                ScaleTransition(scale: anim, child: child),
            child: Text(
              '$score',
              key: ValueKey(score),
              style: const TextStyle(
                color: _kNeon,
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimerBadge extends StatelessWidget {
  const _TimerBadge({required this.timeLeft});
  final int timeLeft;

  Color get _color {
    if (timeLeft > 12) return _kSuccess;
    if (timeLeft > 6) return _kGold;
    return _kError;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: 300.ms,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _color.withOpacity(0.4)),
        boxShadow: [
          BoxShadow(color: _color.withOpacity(0.12), blurRadius: 10),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.timer_rounded, color: _color, size: 15),
          const Gap(4),
          AnimatedSwitcher(
            duration: 180.ms,
            transitionBuilder: (child, anim) =>
                ScaleTransition(scale: anim, child: child),
            child: Text(
              '$timeLeft',
              key: ValueKey(timeLeft),
              style: TextStyle(
                color: _color,
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Progress section ─────────────────────────────────────────

class _ProgressSection extends StatelessWidget {
  const _ProgressSection({required this.game});
  final SpeedBrainState game;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          // time bar
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 1, end: game.timeProgress),
            duration: 600.ms,
            builder: (_, value, __) {
              final color = value > 0.5
                  ? _kSuccess
                  : value > 0.25
                      ? _kGold
                      : _kError;
              return ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: value,
                  minHeight: 7,
                  backgroundColor: _kSurfaceLight,
                  valueColor: AlwaysStoppedAnimation(color),
                ),
              );
            },
          ),
          const Gap(10),
          // question dots
          Row(
            children: List.generate(game.totalQuestions, (i) {
              Color dotColor;
              if (i < game.answerHistory.length) {
                dotColor =
                    game.answerHistory[i] ? _kSuccess : _kError;
              } else if (i == game.questionIndex) {
                dotColor = _kNeon;
              } else {
                dotColor = _kSurfaceLight;
              }
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: AnimatedContainer(
                    duration: 300.ms,
                    height: 5,
                    decoration: BoxDecoration(
                      color: dotColor,
                      borderRadius: BorderRadius.circular(3),
                      boxShadow: i == game.questionIndex
                          ? [
                              BoxShadow(
                                color: _kNeon.withOpacity(0.5),
                                blurRadius: 6,
                              ),
                            ]
                          : null,
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

// ── Question card ─────────────────────────────────────────────

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({required this.game});
  final SpeedBrainState game;

  @override
  Widget build(BuildContext context) {
    final question = game.question;
    if (question == null) return const SizedBox.shrink();

    final tag = question.category == 'math' ? '⚡ Math' : '🧠 Logic';
    final tagColor = question.category == 'math' ? _kCyan : _kNeon;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: AnimatedSwitcher(
        duration: 280.ms,
        transitionBuilder: (child, anim) => FadeTransition(
          opacity: anim,
          child: SlideTransition(
            position: Tween(
              begin: const Offset(0, 0.08),
              end: Offset.zero,
            ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOut)),
            child: child,
          ),
        ),
        child: Container(
          key: ValueKey(game.questionIndex),
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
          decoration: BoxDecoration(
            color: _kSurface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: _kNeon.withOpacity(0.2)),
            boxShadow: [
              BoxShadow(
                color: _kNeon.withOpacity(0.07),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: tagColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: tagColor.withOpacity(0.3)),
                ),
                child: Text(
                  tag,
                  style: TextStyle(
                    color: tagColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const Gap(14),
              Text(
                question.prompt,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: _kText,
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                ),
              ),
              const Gap(10),
              const Text(
                'Choose the correct answer',
                style: TextStyle(color: _kHint, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Bonus banner ─────────────────────────────────────────────

class _BonusBanner extends StatelessWidget {
  const _BonusBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: _kGold.withOpacity(0.15),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _kGold.withOpacity(0.5)),
            boxShadow: [
              BoxShadow(color: _kGold.withOpacity(0.3), blurRadius: 12),
            ],
          ),
          child: const Row(
            children: [
              Icon(Icons.flash_on_rounded, color: _kGold, size: 16),
              Gap(6),
              Text(
                '+5 SPEED BONUS!',
                style: TextStyle(
                  color: _kGold,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
        ),
      ],
    )
        .animate()
        .fadeIn(duration: 200.ms)
        .scale(begin: const Offset(0.8, 0.8), duration: 200.ms,
            curve: Curves.elasticOut);
  }
}

// ── Answer grid ──────────────────────────────────────────────

class _AnswerGrid extends ConsumerWidget {
  const _AnswerGrid({required this.game});
  final SpeedBrainState game;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final question = game.question;
    if (question == null) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 2.3,
        ),
        itemCount: question.options.length,
        itemBuilder: (_, i) {
          return _AnswerTile(
            index: i,
            label: question.options[i],
            game: game,
            onTap: () {
              if (game.phase != SpeedBrainPhase.playing) return;
              HapticFeedback.lightImpact();
              ref.read(speedBrainProvider.notifier).selectAnswer(i);
            },
          )
              .animate()
              .fadeIn(duration: 300.ms, delay: Duration(milliseconds: i * 70))
              .slideY(begin: 0.12, duration: 300.ms, curve: Curves.easeOut);
        },
      ),
    );
  }
}

class _AnswerTile extends StatelessWidget {
  const _AnswerTile({
    required this.index,
    required this.label,
    required this.game,
    required this.onTap,
  });

  final int index;
  final String label;
  final SpeedBrainState game;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final answered = game.phase == SpeedBrainPhase.answered;
    final selected = game.selectedIndex;
    final correctIdx = game.question?.correctIndex;
    final isTimeout = selected == -1;

    final isCorrect = index == correctIdx;
    final isWrong = !isTimeout && index == selected && !isCorrect;

    Color border = _kBorder;
    Color bg = _kSurface;
    Color text = _kText;

    if (answered) {
      if (isCorrect) {
        border = _kSuccess;
        bg = _kSuccess.withOpacity(0.14);
        text = _kSuccess;
      } else if (isWrong) {
        border = _kError;
        bg = _kError.withOpacity(0.14);
        text = _kError;
      }
    }

    final glowing = answered && isCorrect;

    return GestureDetector(
      onTap: game.phase == SpeedBrainPhase.playing ? onTap : null,
      child: AnimatedContainer(
        duration: 220.ms,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: border, width: 1.5),
          boxShadow: glowing
              ? [BoxShadow(color: _kSuccess.withOpacity(0.3), blurRadius: 16)]
              : isWrong
                  ? [BoxShadow(color: _kError.withOpacity(0.25), blurRadius: 12)]
                  : [],
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: text,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      )
          .animate(target: glowing ? 1 : 0)
          .scale(
            begin: const Offset(0.94, 0.94),
            end: const Offset(1.0, 1.0),
            duration: 300.ms,
            curve: Curves.elasticOut,
          ),
    );
  }
}

// ════════════════════════════════════════════════════════════
// RESULT VIEW
// ════════════════════════════════════════════════════════════

class _ResultView extends ConsumerWidget {
  const _ResultView({super.key, required this.game});
  final SpeedBrainState game;

  String get _grade {
    final acc = game.accuracy;
    final s = game.score;
    if (acc >= 0.9 && s >= 120) return 'S';
    if (acc >= 0.7 || s >= 90) return 'A';
    if (acc >= 0.5 || s >= 60) return 'B';
    return 'C';
  }

  Color get _gradeColor {
    switch (_grade) {
      case 'S':
        return _kGold;
      case 'A':
        return _kSuccess;
      case 'B':
        return _kCyan;
      default:
        return _kHint;
    }
  }

  String get _gradeLabel {
    switch (_grade) {
      case 'S':
        return 'Perfect!';
      case 'A':
        return 'Excellent!';
      case 'B':
        return 'Good job!';
      default:
        return 'Keep going!';
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 30),
      child: Column(
        children: [
          // ── header ──────────────────────────────────────
          Row(
            children: [
              GestureDetector(
                onTap: () => context.pop(),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _kSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _kBorder),
                  ),
                  child: const Icon(Icons.close_rounded,
                      color: _kText, size: 20),
                ),
              ),
              const Spacer(),
              const Text(
                'Game Over',
                style: TextStyle(
                  color: _kText,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Spacer(),
              const SizedBox(width: 40),
            ],
          )
              .animate()
              .fadeIn(duration: 400.ms)
              .slideY(begin: -0.1, duration: 400.ms),

          const Gap(32),

          // ── grade badge ──────────────────────────────────
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _gradeColor.withOpacity(0.12),
              border: Border.all(color: _gradeColor.withOpacity(0.5), width: 2),
              boxShadow: [
                BoxShadow(
                  color: _gradeColor.withOpacity(0.3),
                  blurRadius: 30,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Center(
              child: Text(
                _grade,
                style: TextStyle(
                  color: _gradeColor,
                  fontSize: 46,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          )
              .animate()
              .fadeIn(delay: 150.ms, duration: 400.ms)
              .scale(
                begin: const Offset(0.5, 0.5),
                delay: 150.ms,
                duration: 500.ms,
                curve: Curves.elasticOut,
              ),

          const Gap(10),

          Text(
            _gradeLabel,
            style: TextStyle(
              color: _gradeColor,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          )
              .animate()
              .fadeIn(delay: 300.ms, duration: 300.ms),

          const Gap(32),

          // ── score ────────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24),
            decoration: BoxDecoration(
              color: _kSurface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _kNeon.withOpacity(0.2)),
              boxShadow: [
                BoxShadow(
                  color: _kNeon.withOpacity(0.08),
                  blurRadius: 20,
                ),
              ],
            ),
            child: Column(
              children: [
                const Text(
                  'FINAL SCORE',
                  style: TextStyle(
                    color: _kHint,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.5,
                  ),
                ),
                const Gap(6),
                Text(
                  '${game.score}',
                  style: TextStyle(
                    color: _kNeon,
                    fontSize: 56,
                    fontWeight: FontWeight.w900,
                    shadows: [
                      Shadow(color: _kNeon.withOpacity(0.5), blurRadius: 16),
                    ],
                  ),
                ),
                Text(
                  'out of ${game.totalQuestions * 15}',
                  style: const TextStyle(color: _kHint, fontSize: 12),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(delay: 200.ms, duration: 400.ms)
              .slideY(begin: 0.1, delay: 200.ms, duration: 400.ms),

          const Gap(16),

          // ── stats row ────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'ACCURACY',
                  value:
                      '${(game.accuracy * 100).toStringAsFixed(0)}%',
                  icon: Icons.gps_fixed_rounded,
                  color: _kSuccess,
                  delay: 300.ms,
                ),
              ),
              const Gap(12),
              Expanded(
                child: _StatCard(
                  label: 'AVG TIME',
                  value: '${game.avgTime.toStringAsFixed(1)}s',
                  icon: Icons.speed_rounded,
                  color: _kCyan,
                  delay: 380.ms,
                ),
              ),
              const Gap(12),
              Expanded(
                child: _StatCard(
                  label: 'CORRECT',
                  value: '${game.correctCount}/${game.totalQuestions}',
                  icon: Icons.check_circle_rounded,
                  color: _kGold,
                  delay: 460.ms,
                ),
              ),
            ],
          ),

          const Gap(20),

          // ── answer history ───────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _kSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _kBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'ANSWER HISTORY',
                  style: TextStyle(
                    color: _kHint,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
                const Gap(12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: List.generate(
                    game.answerHistory.length,
                    (i) => Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: game.answerHistory[i]
                            ? _kSuccess.withOpacity(0.15)
                            : _kError.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: game.answerHistory[i]
                              ? _kSuccess.withOpacity(0.5)
                              : _kError.withOpacity(0.5),
                        ),
                      ),
                      child: Center(
                        child: Icon(
                          game.answerHistory[i]
                              ? Icons.check_rounded
                              : Icons.close_rounded,
                          color: game.answerHistory[i] ? _kSuccess : _kError,
                          size: 16,
                        ),
                      ),
                    )
                        .animate()
                        .fadeIn(
                          delay: Duration(milliseconds: 500 + i * 60),
                          duration: 250.ms,
                        )
                        .scale(
                          begin: const Offset(0.5, 0.5),
                          delay: Duration(milliseconds: 500 + i * 60),
                          duration: 250.ms,
                          curve: Curves.easeOut,
                        ),
                  ),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(delay: 500.ms, duration: 400.ms),

          const Gap(28),

          // ── buttons ──────────────────────────────────────
          _NeonButton(
            label: 'Play Again',
            color: _kNeon,
            icon: Icons.replay_rounded,
            onTap: () =>
                ref.read(speedBrainProvider.notifier).startGame(),
          )
              .animate()
              .fadeIn(delay: 600.ms, duration: 300.ms)
              .slideY(begin: 0.15, delay: 600.ms),

          const Gap(12),

          GestureDetector(
            onTap: () => context.pop(),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: _kSurfaceLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _kBorder),
              ),
              child: const Center(
                child: Text(
                  'Back to Menu',
                  style: TextStyle(
                    color: _kHint,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          )
              .animate()
              .fadeIn(delay: 680.ms, duration: 300.ms),
        ],
      ),
    );
  }
}

// ── Stat card ─────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.delay,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final Duration delay;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: _kSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.25)),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.08), blurRadius: 12),
        ],
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const Gap(6),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Gap(2),
          Text(
            label,
            style: const TextStyle(
              color: _kHint,
              fontSize: 9,
              fontWeight: FontWeight.w600,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(delay: delay, duration: 350.ms)
        .slideY(begin: 0.15, delay: delay, duration: 350.ms);
  }
}

// ── Neon button ───────────────────────────────────────────────

class _NeonButton extends StatelessWidget {
  const _NeonButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.withOpacity(0.85), color],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: color.withOpacity(0.4), blurRadius: 20),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const Gap(10),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
