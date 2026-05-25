import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'speed_brain_question.dart';
import 'speed_brain_state.dart';

final speedBrainProvider =
    NotifierProvider<SpeedBrainNotifier, SpeedBrainState>(
  SpeedBrainNotifier.new,
);

class SpeedBrainNotifier extends Notifier<SpeedBrainState> {
  static const int _totalTime = 20;
  static const int _questionsPerGame = 10;
  static const int _quickThreshold = 5;   // answered in < 5 s → bonus
  static const int _correctPoints = 10;
  static const int _bonusPoints = 5;
  static const _advanceDelay = Duration(milliseconds: 1400);

  Timer? _tick;
  Timer? _advance;

  @override
  SpeedBrainState build() {
    ref.onDispose(_cancelAll);
    return SpeedBrainState.initial();
  }

  // ── public ───────────────────────────────────────────────

  void startGame() {
    _cancelAll();
    final questions = _pickQuestions();
    state = SpeedBrainState(
      phase: SpeedBrainPhase.playing,
      questions: questions,
      questionIndex: 0,
      score: 0,
      timeLeft: _totalTime,
      selectedIndex: null,
      answerHistory: [],
      secondsUsed: [],
      lastWasBonus: false,
    );
    _startTick();
  }

  void selectAnswer(int index) {
    if (state.phase != SpeedBrainPhase.playing) return;
    _tick?.cancel();

    final q = state.question;
    if (q == null) return;

    final timeUsed = _totalTime - state.timeLeft;
    final isCorrect = index == q.correctIndex;
    final isQuick = isCorrect && timeUsed < _quickThreshold;

    state = state.copyWith(
      phase: SpeedBrainPhase.answered,
      selectedIndex: index,
      score: state.score +
          (isCorrect ? _correctPoints : 0) +
          (isQuick ? _bonusPoints : 0),
      answerHistory: [...state.answerHistory, isCorrect],
      secondsUsed: [...state.secondsUsed, timeUsed],
      lastWasBonus: isQuick,
    );

    _advance = Timer(_advanceDelay, _next);
  }

  // ── private ──────────────────────────────────────────────

  void _onTick() {
    if (state.phase != SpeedBrainPhase.playing) return;

    if (state.timeLeft <= 1) {
      _tick?.cancel();
      // timeout – count as wrong, reveal correct answer
      state = state.copyWith(
        phase: SpeedBrainPhase.answered,
        selectedIndex: -1,
        timeLeft: 0,
        answerHistory: [...state.answerHistory, false],
        secondsUsed: [...state.secondsUsed, _totalTime],
        lastWasBonus: false,
      );
      _advance = Timer(_advanceDelay, _next);
      return;
    }

    state = state.copyWith(timeLeft: state.timeLeft - 1);
  }

  void _next() {
    final next = state.questionIndex + 1;
    if (next >= state.totalQuestions) {
      state = state.copyWith(phase: SpeedBrainPhase.finished);
      return;
    }
    state = state.copyWith(
      phase: SpeedBrainPhase.playing,
      questionIndex: next,
      timeLeft: _totalTime,
      clearSelected: true,
      lastWasBonus: false,
    );
    _startTick();
  }

  void _startTick() {
    _tick?.cancel();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => _onTick());
  }

  void _cancelAll() {
    _tick?.cancel();
    _advance?.cancel();
  }

  List<SpeedBrainQuestion> _pickQuestions() {
    final rng = Random();
    return ([..._bank]..shuffle(rng)).take(_questionsPerGame).toList();
  }

  // ── question bank (25 questions) ─────────────────────────

  static const List<SpeedBrainQuestion> _bank = [
    // ── MATH ────────────────────────────────────────────────
    SpeedBrainQuestion(
      prompt: '7 × 8 = ?',
      options: ['54', '56', '58', '64'],
      correctIndex: 1,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '144 ÷ 12 = ?',
      options: ['11', '12', '13', '14'],
      correctIndex: 1,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '√64 = ?',
      options: ['6', '7', '8', '9'],
      correctIndex: 2,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '15² = ?',
      options: ['175', '200', '225', '250'],
      correctIndex: 2,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '3³ = ?',
      options: ['9', '18', '27', '36'],
      correctIndex: 2,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '48 ÷ 6 + 3 = ?',
      options: ['9', '10', '11', '12'],
      correctIndex: 2,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '(12 + 8) × 3 = ?',
      options: ['50', '56', '60', '66'],
      correctIndex: 2,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '100 − 37 = ?',
      options: ['53', '61', '63', '73'],
      correctIndex: 2,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '9 × 9 = ?',
      options: ['72', '81', '90', '99'],
      correctIndex: 1,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '√121 = ?',
      options: ['9', '10', '11', '12'],
      correctIndex: 2,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '17 × 3 = ?',
      options: ['48', '51', '54', '57'],
      correctIndex: 1,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '250 ÷ 5 = ?',
      options: ['40', '45', '50', '55'],
      correctIndex: 2,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '2⁸ = ?',
      options: ['128', '192', '256', '512'],
      correctIndex: 2,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '6! ÷ 120 = ?',
      options: ['4', '6', '8', '12'],
      correctIndex: 1,
      category: 'math',
    ),
    SpeedBrainQuestion(
      prompt: '45 × 2 + 10 = ?',
      options: ['90', '95', '100', '105'],
      correctIndex: 2,
      category: 'math',
    ),
    // ── LOGIC / SEQUENCES ───────────────────────────────────
    SpeedBrainQuestion(
      prompt: '2, 4, 8, 16, __?',
      options: ['24', '28', '32', '36'],
      correctIndex: 2,
      category: 'logic',
    ),
    SpeedBrainQuestion(
      prompt: '1, 1, 2, 3, 5, 8, __?',
      options: ['11', '12', '13', '14'],
      correctIndex: 2,
      category: 'logic',
    ),
    SpeedBrainQuestion(
      prompt: '3, 6, 11, 18, 27, __?',
      options: ['36', '38', '39', '40'],
      correctIndex: 1,
      category: 'logic',
    ),
    SpeedBrainQuestion(
      prompt: '2, 6, 12, 20, 30, __?',
      options: ['40', '42', '44', '46'],
      correctIndex: 1,
      category: 'logic',
    ),
    SpeedBrainQuestion(
      prompt: '5, 10, 20, 40, __?',
      options: ['60', '70', '80', '90'],
      correctIndex: 2,
      category: 'logic',
    ),
    SpeedBrainQuestion(
      prompt: '1, 4, 9, 16, 25, __?',
      options: ['30', '32', '36', '38'],
      correctIndex: 2,
      category: 'logic',
    ),
    SpeedBrainQuestion(
      prompt: '1, 3, 7, 15, 31, __?',
      options: ['47', '55', '63', '71'],
      correctIndex: 2,
      category: 'logic',
    ),
    SpeedBrainQuestion(
      prompt: '100 → 50 → 25 → __?',
      options: ['10', '12', '12.5', '15'],
      correctIndex: 2,
      category: 'logic',
    ),
    SpeedBrainQuestion(
      prompt: 'Odd one out: 2, 4, 6, 9, 12',
      options: ['2', '6', '9', '12'],
      correctIndex: 2,
      category: 'logic',
    ),
    SpeedBrainQuestion(
      prompt: 'If A > B > C, which is true?',
      options: ['C > A', 'A > C', 'B > A', 'A = C'],
      correctIndex: 1,
      category: 'logic',
    ),
  ];
}
