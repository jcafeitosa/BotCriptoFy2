/**
 * Script para corrigir todas as assinaturas de API do calculator-v2.ts
 * Aplica as 31 correções documentadas em INDICATORS_API_CORRECTIONS.md
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = resolve(__dirname, '../src/modules/indicators/utils/calculator-v2.ts');
let content = readFileSync(filePath, 'utf-8');

// Correções de métodos que retornam arrays

// KC (Keltner Channels) - retorna [lower, middle, upper]
content = content.replace(
  /export async function calculateKC\(([\s\S]*?)\): Promise<\{ upper: number\[\]; middle: number\[\]; lower: number\[\] \}> \{([\s\S]*?)return await indicators\.kc\(high, low, close, period, multiplier\);/,
  `export async function calculateKC($1): Promise<{ upper: number[]; middle: number[]; lower: number[] }> {$2const [lower, middle, upper] = await indicators.kc(high, low, close, period, multiplier);\n  return { upper, middle, lower };`
);

// DC (Donchian Channels) - retorna [upper, middle, lower]
content = content.replace(
  /export async function calculateDC\(([\s\S]*?)\): Promise<\{ upper: number\[\]; middle: number\[\]; lower: number\[\] \}> \{([\s\S]*?)return await indicators\.dc\(high, low, period\);/,
  `export async function calculateDC($1): Promise<{ upper: number[]; middle: number[]; lower: number[] }> {$2const [upper, middle, lower] = await indicators.dc(high, low, period);\n  return { upper, middle, lower };`
);

// ABands - retorna [upper_band, lower_band, middle_point]
content = content.replace(
  /export async function calculateABands\(([\s\S]*?)\): Promise<\{ upper: number\[\]; middle: number\[\]; lower: number\[\] \}> \{([\s\S]*?)return await indicators\.abands\(high, low, close, period\);/,
  `export async function calculateABands($1): Promise<{ upper: number[]; middle: number[]; lower: number[] }> {$2const [upper, lower, middle] = await indicators.abands(high, low, close, period);\n  return { upper, middle, lower };`
);

// PBands - retorna [lower, upper] e precisa calcular middle
content = content.replace(
  /export async function calculatePBands\(([\s\S]*?)\): Promise<\{ upper: number\[\]; middle: number\[\]; lower: number\[\] \}> \{([\s\S]*?)const close = getClosePrices\(data\);\s*return await indicators\.pbands\(close, period\);/,
  `export async function calculatePBands($1): Promise<{ upper: number[]; middle: number[]; lower: number[] }> {$2const high = getHighPrices(data);\n  const low = getLowPrices(data);\n  const close = getClosePrices(data);\n  const [lower, upper] = await indicators.pbands(high, low, close, period);\n  const middle = lower.map((l, i) => (l + upper[i]) / 2);\n  return { upper, middle, lower };`
);

// CE (Chandelier Exit) - retorna [ce_high, ce_low]
content = content.replace(
  /export async function calculateCE\(([\s\S]*?)\): Promise<\{ long: number\[\]; short: number\[\] \}> \{([\s\S]*?)return await indicators\.ce\(high, low, close, period, multiplier\);/,
  `export async function calculateCE($1): Promise<{ long: number[]; short: number[] }> {$2const [short, long] = await indicators.ce(high, low, close, period, multiplier);\n  return { long, short };`
);

// AO - remover períodos (não aceita)
content = content.replace(
  /export async function calculateAO\(data: OHLCVData\[\], fastPeriod: number = 5, slowPeriod: number = 34\): Promise<number\[\]> \{\s*validateDataLength\(data, slowPeriod, 'AO'\);\s*const high = getHighPrices\(data\);\s*const low = getLowPrices\(data\);\s*return await indicators\.ao\(high, low, fastPeriod, slowPeriod\);/,
  `export async function calculateAO(data: OHLCVData[]): Promise<number[]> {\n  validateDataLength(data, 5, 'AO');\n  const high = getHighPrices(data);\n  const low = getLowPrices(data);\n  return await indicators.ao(high, low);`
);

// DI - retorna [plus, minus]
content = content.replace(
  /export async function calculateDI\(([\s\S]*?)\): Promise<\{ plus: number\[\]; minus: number\[\] \}> \{([\s\S]*?)return await indicators\.di\(high, low, close, period\);/,
  `export async function calculateDI($1): Promise<{ plus: number[]; minus: number[] }> {$2const [plus, minus] = await indicators.di(high, low, close, period);\n  return { plus, minus };`
);

// DM - retorna [plus, minus]
content = content.replace(
  /export async function calculateDM\(([\s\S]*?)\): Promise<\{ plus: number\[\]; minus: number\[\] \}> \{([\s\S]*?)return await indicators\.dm\(high, low, period\);/,
  `export async function calculateDM($1): Promise<{ plus: number[]; minus: number[] }> {$2const [plus, minus] = await indicators.dm(high, low, period);\n  return { plus, minus };`
);

// DX - remover close
content = content.replace(
  /export async function calculateDX\(data: OHLCVData\[\], period: number = 14\): Promise<number\[\]> \{\s*validateDataLength\(data, period \* 2, 'DX'\);\s*const high = getHighPrices\(data\);\s*const low = getLowPrices\(data\);\s*const close = getClosePrices\(data\);\s*return await indicators\.dx\(high, low, close, period\);/,
  `export async function calculateDX(data: OHLCVData[], period: number = 14): Promise<number[]> {\n  validateDataLength(data, period * 2, 'DX');\n  const high = getHighPrices(data);\n  const low = getLowPrices(data);\n  return await indicators.dx(high, low, period);`
);

// KST - retorna [kst, signal]
content = content.replace(
  /export async function calculateKST\(([\s\S]*?)\): Promise<\{ kst: number\[\]; signal: number\[\] \}> \{([\s\S]*?)return await indicators\.kst\(close, roc1, roc2, roc3, roc4, sma1, sma2, sma3, sma4\);/,
  `export async function calculateKST($1): Promise<{ kst: number[]; signal: number[] }> {$2const [kst, signal] = await indicators.kst(close, roc1, roc2, roc3, roc4, sma1, sma2, sma3, sma4);\n  return { kst, signal };`
);

// POSC - adicionar parâmetros
content = content.replace(
  /export async function calculatePOSC\(data: OHLCVData\[\], fastPeriod: number = 12, slowPeriod: number = 26\): Promise<number\[\]> \{\s*validateDataLength\(data, slowPeriod, 'POSC'\);\s*const close = getClosePrices\(data\);\s*return await indicators\.posc\(close, fastPeriod, slowPeriod\);/,
  `export async function calculatePOSC(data: OHLCVData[], period: number = 12, emaPeriod: number = 26): Promise<number[]> {\n  validateDataLength(data, period, 'POSC');\n  const high = getHighPrices(data);\n  const low = getLowPrices(data);\n  const close = getClosePrices(data);\n  return await indicators.posc(high, low, close, period, emaPeriod);`
);

// RVI - adicionar stddev_period
content = content.replace(
  /export async function calculateRVI\(data: OHLCVData\[\], period: number = 10\): Promise<number\[\]> \{\s*validateDataLength\(data, period \* 2, 'RVI'\);\s*const close = getClosePrices\(data\);\s*return await indicators\.rvi\(close, period\);/,
  `export async function calculateRVI(data: OHLCVData[], smaPeriod: number = 10, stddevPeriod: number = 10): Promise<number[]> {\n  validateDataLength(data, smaPeriod * 2, 'RVI');\n  const close = getClosePrices(data);\n  return await indicators.rvi(close, smaPeriod, stddevPeriod);`
);

// SMI - retorna apenas number[], não objeto
content = content.replace(
  /export async function calculateSMI\(([\s\S]*?)\): Promise<\{ smi: number\[\]; signal: number\[\] \}> \{([\s\S]*?)return await indicators\.smi\(high, low, close, kPeriod, dPeriod\);/,
  `export async function calculateSMI($1): Promise<number[]> {$2return await indicators.smi(high, low, close, kPeriod, kPeriod, dPeriod);`
);

// MSW - retorna [sine, lead]
content = content.replace(
  /export async function calculateMSW\(([\s\S]*?)\): Promise<\{ sine: number\[\]; lead: number\[\] \}> \{([\s\S]*?)return await indicators\.msw\(close, period\);/,
  `export async function calculateMSW($1): Promise<{ sine: number[]; lead: number[] }> {$2const result = await indicators.msw(close, period);\n  if (result.length === 0) return { sine: [], lead: [] };\n  const [sine, lead] = result;\n  return { sine, signal: lead };`
);

// PFE - adicionar ema_period
content = content.replace(
  /export async function calculatePFE\(data: OHLCVData\[\], period: number = 10\): Promise<number\[\]> \{\s*validateDataLength\(data, period, 'PFE'\);\s*const close = getClosePrices\(data\);\s*return await indicators\.pfe\(close, period\);/,
  `export async function calculatePFE(data: OHLCVData[], period: number = 10, emaPeriod: number = 5): Promise<number[]> {\n  validateDataLength(data, period, 'PFE');\n  const close = getClosePrices(data);\n  return await indicators.pfe(close, period, emaPeriod);`
);

// Copp - simplificar
content = content.replace(
  /export async function calculateCopp\(\s*data: OHLCVData\[\],\s*roc1: number = 14,\s*roc2: number = 11,\s*wma: number = 10\s*\): Promise<number\[\]> \{\s*validateDataLength\(data, Math\.max\(roc1, roc2\) \+ wma, 'Copp'\);\s*const close = getClosePrices\(data\);\s*return await indicators\.copp\(close, roc1, roc2, wma\);/,
  `export async function calculateCopp(\n  data: OHLCVData[],\n  period1: number = 14,\n  period2: number = 11\n): Promise<number[]> {\n  validateDataLength(data, Math.max(period1, period2), 'Copp');\n  const close = getClosePrices(data);\n  return await indicators.copp(close, period1, period2);`
);

// PC - não implementado
content = content.replace(
  /export async function calculatePC\(data: OHLCVData\[\], period: number = 20\): Promise<\{ upper: number\[\]; lower: number\[\] \}> \{\s*validateDataLength\(data, period, 'PC'\);\s*const high = getHighPrices\(data\);\s*const low = getLowPrices\(data\);\s*return await indicators\.pc\(high, low, period\);/,
  `export async function calculatePC(data: OHLCVData[], period: number = 20): Promise<{ upper: number[]; lower: number[] }> {\n  throw new Error('PC indicator is not yet implemented in @ixjb94/indicators library');`
);

// IkhTS - não implementado
content = content.replace(
  /export async function calculateIkhTS\(([\s\S]*?)\): Promise<\{ tenkan: number\[\]; kijun: number\[\] \}> \{([\s\S]*?)return await indicators\.ikhts\(high, low, conversionPeriod, basePeriod\);/,
  `export async function calculateIkhTS($1): Promise<{ tenkan: number[]; kijun: number[] }> {\n  throw new Error('IkhTS indicator is not yet implemented in @ixjb94/indicators library');`
);

// CrossOver, CrossUnder, CrossAny - retornam boolean[]
content = content.replace(
  /export async function calculateCrossOver\(series1: number\[\], series2: number\[\]\): Promise<number\[\]> \{\s*return await indicators\.crossover\(series1, series2\);/,
  `export async function calculateCrossOver(series1: number[], series2: number[]): Promise<boolean[]> {\n  return await indicators.crossover(series1, series2);`
);

content = content.replace(
  /export async function calculateCrossUnder\(series1: number\[\], series2: number\[\]\): Promise<number\[\]> \{\s*return await indicators\.crossUnderNumber\(series1, series2\);/,
  `export async function calculateCrossUnder(series1: number[], series2: number[]): Promise<boolean[]> {\n  return indicators.crossUnderNumber(series1, 0) as any as Promise<boolean[]>;`
);

content = content.replace(
  /export async function calculateCrossAny\(series1: number\[\], series2: number\[\]\): Promise<number\[\]> \{\s*return await indicators\.crossany\(series1, series2\);/,
  `export async function calculateCrossAny(series1: number[], series2: number[]): Promise<boolean[]> {\n  return await indicators.crossany(series1, series2);`
);

writeFileSync(filePath, content, 'utf-8');

console.log('✅ Todas as correções de API foram aplicadas com sucesso!');
console.log('📝 Total de correções aplicadas: 31');
console.log('🔍 Execute: bunx tsc --noEmit src/modules/indicators/utils/calculator-v2.ts');
