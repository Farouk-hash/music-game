import { useState, useMemo, useCallback } from 'react';

export function useRecallState(recallItems) {
  const [answers, setAnswers] = useState(new Map());
  const [submitted, setSubmitted] = useState(false);

  // Generate valid composite keys once
  const validAnswerKeys = useMemo(() => 
    new Set(recallItems.map(item => `${item.roundIndex}-${item.questionIndex}`)),
    [recallItems]
  );

  // Filtered validation that ignores stale/duplicate entries
  const allAnswered = useMemo(() => 
    Array.from(answers.keys())
      .filter(key => validAnswerKeys.has(key))
      .length === recallItems.length,
    [answers, validAnswerKeys, recallItems.length]
  );

  const handleSelect = useCallback((roundIndex, questionIndex, value) => {
    if (submitted) return;
    const uniqueKey = `${roundIndex}-${questionIndex}`;
    setAnswers(prev => new Map(prev).set(uniqueKey, value));
  }, [submitted]);

  const handleSubmit = useCallback(() => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
  }, [allAnswered, submitted]);

  const getOptionStatus = useCallback((item, optValue) => {
    const uniqueKey = `${item.roundIndex}-${item.questionIndex}`;
    const userAnswer = answers.get(uniqueKey);
    
    if (optValue === item.correctValue) return 'correct';
    if (userAnswer === optValue && optValue !== item.correctValue) return 'wrong';
    return 'neutral';
  }, [answers]);

  const correctCount = useMemo(() => 
    submitted 
      ? recallItems.filter(item => {
          const uniqueKey = `${item.roundIndex}-${item.questionIndex}`;
          return answers.get(uniqueKey) === item.correctValue;
        }).length 
      : 0,
    [submitted, recallItems, answers]
  );

  return {
    answers,
    submitted,
    allAnswered,
    correctCount,
    handleSelect,
    handleSubmit,
    getOptionStatus,
    setSubmitted, // Expose for parent to trigger actual submission
  };
}