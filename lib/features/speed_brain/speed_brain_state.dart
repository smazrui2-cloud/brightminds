import 'speed_brain_question.dart';

enum SpeedBrainPhase { loading, playing, answered, finished }

class SpeedBrainState {
  const SpeedBrainState({
    required this.phase,
    required this.questions,
    required this.questionIndex,
    required this.score,
    required this.timeLeft,
    required this.selectedIndex,
    required this.answerHistory,
    required this.secondsUsed,
    required this.lastWasBonus,
  });

  final SpeedBrainPhase phase;
  final List<SpeedBrainQuestion> questions;
  final int questionIndex;
  final int score;
  final int timeLeft;          // counts down from 20
  final int? selectedIndex;    // null = unanswered, -1 = timeout
  final List<bool> answerHistory;
  final List<int> secondsUsed; // seconds used per answered question
  final bool lastWasBonus;

  factory SpeedBrainState.initial() => const SpeedBrainState(
        phase: SpeedBrainPhase.loading,
        questions: [],
        questionIndex: 0,
        score: 0,
        timeLeft: 20,
        selectedIndex: null,
        answerHistory: [],
        secondsUsed: [],
        lastWasBonus: false,
      );

  // ── computed ─────────────────────────────────────────────

  int get totalQuestions => questions.length;

  SpeedBrainQuestion? get question =>
      questionIndex < questions.length ? questions[questionIndex] : null;

  double get timeProgress => timeLeft / 20;

  int get correctCount => answerHistory.where((v) => v).length;

  double get accuracy =>
      answerHistory.isEmpty ? 0 : correctCount / answerHistory.length;

  double get avgTime =>
      secondsUsed.isEmpty
          ? 0
          : secondsUsed.reduce((a, b) => a + b) / secondsUsed.length;

  bool get isPerfect =>
      totalQuestions > 0 && correctCount == totalQuestions;

  // ── copy ─────────────────────────────────────────────────

  SpeedBrainState copyWith({
    SpeedBrainPhase? phase,
    List<SpeedBrainQuestion>? questions,
    int? questionIndex,
    int? score,
    int? timeLeft,
    int? selectedIndex,
    bool clearSelected = false,
    List<bool>? answerHistory,
    List<int>? secondsUsed,
    bool? lastWasBonus,
  }) =>
      SpeedBrainState(
        phase: phase ?? this.phase,
        questions: questions ?? this.questions,
        questionIndex: questionIndex ?? this.questionIndex,
        score: score ?? this.score,
        timeLeft: timeLeft ?? this.timeLeft,
        selectedIndex:
            clearSelected ? null : (selectedIndex ?? this.selectedIndex),
        answerHistory: answerHistory ?? this.answerHistory,
        secondsUsed: secondsUsed ?? this.secondsUsed,
        lastWasBonus: lastWasBonus ?? this.lastWasBonus,
      );
}
