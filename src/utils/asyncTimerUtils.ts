const waitSeconds = (ms: number) => {
  return new Promise((res) => {
    setTimeout(() => {
      res(true);
    }, ms * 1000);
  });
};

export const asyncTimerUtils = {
  waitSeconds,
};
