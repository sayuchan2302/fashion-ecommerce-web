export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond';

export const TIER_THRESHOLDS: Record<Exclude<LoyaltyTier, 'Bronze'>, number> = {
  Silver: 1000000,
  Gold: 5000000,
  Diamond: 15000000,
};

export const TIER_CONFIG: Record<LoyaltyTier, { label: string; color: string; bg: string }> = {
  Bronze: { label: 'Bronze', color: '#cd7f32', bg: '#fdf6f0' },
  Silver: { label: 'Silver', color: '#c0c0c0', bg: '#f8f8f8' },
  Gold: { label: 'Gold', color: '#ffd700', bg: '#fffbe6' },
  Diamond: { label: 'Diamond', color: '#b9f2ff', bg: '#f0f9ff' },
};

export const calculateTier = (totalSpent: number): LoyaltyTier => {
  if (totalSpent >= TIER_THRESHOLDS.Diamond) return 'Diamond';
  if (totalSpent >= TIER_THRESHOLDS.Gold) return 'Gold';
  if (totalSpent >= TIER_THRESHOLDS.Silver) return 'Silver';
  return 'Bronze';
};

export const getNextTier = (currentTier: LoyaltyTier): LoyaltyTier | null => {
  const tiers: LoyaltyTier[] = ['Bronze', 'Silver', 'Gold', 'Diamond'];
  const currentIndex = tiers.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex === tiers.length - 1) return null;
  return tiers[currentIndex + 1];
};

export const getProgressToNextTier = (totalSpent: number, currentTier: LoyaltyTier): number => {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 100;

  const currentThreshold = currentTier === 'Bronze' ? 0 : TIER_THRESHOLDS[currentTier as Exclude<LoyaltyTier, 'Bronze'>];
  const nextThreshold = TIER_THRESHOLDS[nextTier as Exclude<LoyaltyTier, 'Bronze'>];
  
  if (totalSpent >= nextThreshold) return 100;
  
  const progress = ((totalSpent - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(100, Math.max(0, progress));
};

export const getSpendRequiredForNextTier = (currentTier: LoyaltyTier, totalSpent: number): number => {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 0;
  
  const required = TIER_THRESHOLDS[nextTier as Exclude<LoyaltyTier, 'Bronze'>] - totalSpent;
  return Math.max(0, required);
};