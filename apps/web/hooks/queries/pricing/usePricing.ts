import { useQuery } from '@tanstack/react-query';
import { getOrderQuote, type PriceQuote } from '@/lib/api/pricing';
import { useUserStore } from '@/store/userStore';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const pricingKeys = {
  quote: (designId: string) => ['pricing', 'quote', designId] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * 获取服务端报价，供结账页展示价格明细。
 * designId 为 null 时自动禁用查询。
 */
export function useOrderQuote(designId: string | null) {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery<PriceQuote>({
    queryKey: pricingKeys.quote(designId ?? ''),
    queryFn: () => getOrderQuote(designId!),
    enabled: !!accessToken && !!designId,
    staleTime: 5 * 60 * 1000, // 5 分钟内报价不重复请求
  });
}
