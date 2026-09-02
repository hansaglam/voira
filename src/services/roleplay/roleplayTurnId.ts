let sequence = 0;

export function createRoleplayClientTurnId(now = Date.now()): string {
  sequence = (sequence + 1) % 1_000_000;
  return `rp_${now.toString(36)}_${sequence.toString(36)}`;
}
