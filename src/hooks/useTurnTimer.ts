import { useEffect, useState } from 'react';

function getElapsedSeconds(startedAt: string | null) {
  if (!startedAt) {
    return 0;
  }

  const startedAtMs = new Date(startedAt).getTime();
  const delta = Math.max(0, Date.now() - startedAtMs);
  return Math.floor(delta / 1000);
}

export function useTurnTimer(startedAt: string | null, timeLimitSeconds: number) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setElapsedSeconds(getElapsedSeconds(startedAt));
    });

    if (!startedAt) {
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(getElapsedSeconds(startedAt));
    }, 250);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(intervalId);
    };
  }, [startedAt]);

  const remainingSeconds = Math.max(0, timeLimitSeconds - elapsedSeconds);

  return {
    elapsedSeconds,
    remainingSeconds,
    isExpired: remainingSeconds === 0,
  };
}
