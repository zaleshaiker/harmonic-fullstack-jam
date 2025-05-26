const usePoll = <T>(
  apiFunction: () => Promise<T>,
  onDataReceived: (data: T) => void,
  isComplete: (data: T) => boolean,
  onCompleted: () => void,
  pollTime = 1000
) => {
  const interval = setInterval(() => {
    apiFunction()
      .then((data) => {
        onDataReceived(data);
        if (isComplete(data)) {
          onCompleted();
          clearInterval(interval);
        }
      })
      .catch((error) => {
        console.error("Polling error:", error);
        clearInterval(interval);
      });
  }, pollTime);
};

export default usePoll;
