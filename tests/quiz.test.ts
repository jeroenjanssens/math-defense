import { describe, expect, it } from 'vitest';
import { Quiz } from '../src/game/Quiz';
import { seededRng } from '../src/math/rng';
import { defaultMathSettings } from '../src/math/types';
import { emptyProgress } from '../src/profiles/progress';

const makeQuiz = (overrides: Partial<ConstructorParameters<typeof Quiz>[0]> = {}) =>
  new Quiz({
    math: { ...defaultMathSettings(), categories: ['tables6to10'] },
    answerMode: 'typing',
    timerSeconds: null,
    progress: emptyProgress(),
    rng: seededRng(7),
    ...overrides,
  });

const type = (quiz: Quiz, value: number) => String(value).split('').forEach((d) => quiz.typeDigit(Number(d)));

describe('quiz', () => {
  it('accepts a correct typed answer and tracks the streak', () => {
    const quiz = makeQuiz();
    for (let i = 0; i < 3; i++) {
      const p = quiz.next();
      type(quiz, p.answer);
      expect(quiz.submit()?.result).toBe('correct');
    }
    expect(quiz.streak).toBe(3);
    expect(quiz.correct).toBe(3);
  });

  it('records a wrong answer and resets the streak', () => {
    const progress = emptyProgress();
    const quiz = makeQuiz({ progress });
    const p = quiz.next();
    type(quiz, p.answer + 1);
    const outcome = quiz.submit();
    expect(outcome?.result).toBe('wrong');
    expect(quiz.streak).toBe(0);
    expect(quiz.mistakes).toEqual([p.key]);
    expect(progress.facts[p.key].w).toBe(1);
  });

  it('ignores input while showing feedback and empty submits', () => {
    const quiz = makeQuiz();
    quiz.next();
    expect(quiz.submit()).toBeNull();
    type(quiz, 1);
    quiz.submit();
    type(quiz, 5);
    expect(quiz.input).toBe('1');
    expect(quiz.submit()).toBeNull();
  });

  it('times out when the timer is enabled', () => {
    const quiz = makeQuiz({ timerSeconds: 5 });
    quiz.next();
    expect(quiz.tick(4000)).toBeNull();
    expect(quiz.timeLeft).toBeCloseTo(0.2);
    expect(quiz.tick(1500)?.result).toBe('timeout');
    expect(quiz.timeouts).toBe(1);
  });

  it('never times out without a timer', () => {
    const quiz = makeQuiz();
    quiz.next();
    expect(quiz.tick(10 * 60 * 1000)).toBeNull();
    expect(quiz.timeLeft).toBeNull();
  });

  it('supports multiple choice', () => {
    const quiz = makeQuiz({ answerMode: 'choice' });
    const p = quiz.next();
    expect(quiz.choices).toHaveLength(4);
    const index = quiz.choices!.indexOf(p.answer);
    expect(quiz.choose(index)?.result).toBe('correct');
  });

  it('only allows the minus sign with negative numbers', () => {
    const quiz = makeQuiz();
    quiz.next();
    type(quiz, 3);
    quiz.toggleSign();
    expect(quiz.input).toBe('3');
    const neg = makeQuiz({ math: { ...defaultMathSettings(), categories: ['subtraction'], negativeNumbers: true } });
    neg.next();
    type(neg, 3);
    neg.toggleSign();
    expect(neg.input).toBe('-3');
  });

  it('switches answer mode for the current problem', () => {
    const quiz = makeQuiz();
    quiz.next();
    expect(quiz.choices).toBeNull();
    quiz.setAnswerMode('choice');
    expect(quiz.choices).toHaveLength(4);
  });
});
