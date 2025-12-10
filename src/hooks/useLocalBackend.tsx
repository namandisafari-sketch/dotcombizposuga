import { useQuery } from "@tanstack/react-query";
import { localApi } from "@/lib/localApi";

/**
 * Hook to check if local backend is available
 */
export const useLocalBackend = () => {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ["local-backend-health"],
    queryFn: () => localApi.checkHealth(),
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });

  return {
    isAvailable: !!healthData,
    isLoading,
    healthData,
  };
};
