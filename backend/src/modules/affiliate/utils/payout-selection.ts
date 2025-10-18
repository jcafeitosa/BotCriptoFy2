/**
 * Seleção de Comissões para Pagamento
 * Dado um conjunto de comissões aprovadas e um valor alvo, seleciona um
 * subconjunto que atinja (ou ligeiramente exceda) o alvo priorizando menores valores.
 */

export interface CommissionEntry {
  id: string;
  amount: string; // decimal em string
}

export interface SelectionResult {
  selectedIds: string[];
  selectedSum: number; // número já somado e arredondado a 2 casas
}

/**
 * Seleciona comissões para atingir o valor alvo (prioridade: menor valor primeiro).
 */
export function selectCommissionsForAmount(
  commissions: CommissionEntry[],
  targetAmount: number
): SelectionResult {
  if (targetAmount <= 0) return { selectedIds: [], selectedSum: 0 };

  const sorted = [...commissions].sort(
    (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
  );

  const selectedIds: string[] = [];
  let selectedSum = 0;

  for (const c of sorted) {
    const amt = parseFloat(c.amount);
    if (Number.isNaN(amt) || amt <= 0) continue;
    if (selectedSum + amt <= targetAmount + 1e-9) {
      selectedIds.push(c.id);
      selectedSum += amt;
    }
  }

  // Tenta ajuste de encaixe exato via troca simples (1 fora por 1 dentro)
  if (Math.abs(selectedSum - targetAmount) > 1e-9) {
    const selectedSet = new Set(selectedIds);
    const remaining = sorted.filter((c) => !selectedSet.has(c.id));

    for (const yId of [...selectedIds]) {
      const yAmt = parseFloat(sorted.find((c) => c.id === yId)!.amount);
      for (const x of remaining) {
        const xAmt = parseFloat(x.amount);
        const candidate = Math.round((selectedSum - yAmt + xAmt) * 100) / 100;
        if (Math.abs(candidate - targetAmount) < 1e-9) {
          // faz a troca
          selectedIds.splice(selectedIds.indexOf(yId), 1);
          selectedIds.push(x.id);
          selectedSum = candidate;
          break;
        }
      }
      if (Math.abs(selectedSum - targetAmount) < 1e-9) break;
    }
  }

  if (selectedSum < targetAmount) {
    const remaining = sorted.filter((c) => !selectedIds.includes(c.id));
    const candidate = remaining
      .map((c) => ({ id: c.id, amt: parseFloat(c.amount) }))
      .filter((x) => x.amt > 0 && selectedSum + x.amt > targetAmount)
      .sort((a, b) => a.amt - b.amt)[0];
    if (candidate) {
      selectedIds.push(candidate.id);
      selectedSum += candidate.amt;
    }
  }

  // Arredonda a 2 casas para consistência
  selectedSum = Math.round(selectedSum * 100) / 100;
  return { selectedIds, selectedSum };
}
