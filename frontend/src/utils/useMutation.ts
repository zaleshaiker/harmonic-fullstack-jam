import { useState } from "react";

const useMutation = <T, Args>(apiFunction: (args: Args) => Promise<T>) => {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (args: Args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFunction(args);
      setData(response);
      return response;
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, data, loading, error };
};

export default useMutation;
