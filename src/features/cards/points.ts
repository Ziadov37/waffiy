export type RewardChoice = { id: string; threshold: number };

/** Le panier est une simulation : seul le serveur peut débiter les points. */
export function selectionCost(
  rewards: RewardChoice[],
  quantities: Record<string, number>,
): number {
  return rewards.reduce(
    (total, reward) => total + reward.threshold * (quantities[reward.id] ?? 0),
    0,
  );
}

export function maximumQuantity(points: number, cost: number): number {
  return cost > 0 ? Math.max(0, Math.floor(points / cost)) : 0;
}
