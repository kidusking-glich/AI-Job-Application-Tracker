import { MockAiProvider } from './ai.service';
import type { ClauseAnalysisInput, ContractAnalysisResult } from './ai-types';

describe('MockAiProvider Amharic output', () => {
  let provider: MockAiProvider;

  beforeEach(() => {
    jest.useFakeTimers();
    provider = new MockAiProvider();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const clauses: ClauseAnalysisInput[] = [
    {
      clauseNumber: 1,
      title: 'Liability',
      content: 'The party shall not be liable for any loss, indemnify and waive all claims.',
    },
    {
      clauseNumber: 2,
      title: 'Mutual',
      content:
        'Both parties agree to act in good faith with reasonable notice period and mutual obligations.',
    },
    {
      clauseNumber: 3,
      title: 'Standard',
      content: 'This agreement is governed by the laws of Ethiopia.',
    },
  ];

  async function analyze(): Promise<ContractAnalysisResult> {
    const promise = provider.analyzeContract('Test Contract', 'content', clauses, 'ENGLISH');
    // Mirrors the mock's simulated `setTimeout(resolve, 2000)` delay
    await jest.advanceTimersByTimeAsync(2000);
    return promise;
  }

  it('returns Amharic explanations and suggestions for every clause', async () => {
    const result = await analyze();

    expect(result.clauses).toHaveLength(3);
    for (const clause of result.clauses) {
      expect(clause.explanationAmharic).toEqual(expect.any(String));
      expect(clause.suggestionAmharic).toEqual(expect.any(String));
      expect(clause.explanationAmharic!.length).toBeGreaterThan(0);
      expect(clause.suggestionAmharic!.length).toBeGreaterThan(0);
    }
  });

  it('classifies unfavorable clauses as UNFAVORABLE and provides Amharic content', async () => {
    const result = await analyze();

    const bad = result.clauses.find((c) => c.clauseNumber === 1);
    expect(bad?.sentiment).toBe('UNFAVORABLE');
    expect(bad?.riskLevel).toBe('HIGH');
    expect(bad?.explanationAmharic).toBeDefined();
    expect(bad?.suggestionAmharic).toBeDefined();
  });

  it('classifies favorable clauses and provides Amharic content', async () => {
    const result = await analyze();

    const good = result.clauses.find((c) => c.clauseNumber === 2);
    expect(good?.sentiment).toBe('FAVORABLE');
    expect(good?.riskLevel).toBe('LOW');
    expect(good?.explanationAmharic).toBeDefined();
    expect(good?.suggestionAmharic).toBeDefined();
  });

  it('classifies standard clauses as NEUTRAL', async () => {
    const result = await analyze();

    const neutral = result.clauses.find((c) => c.clauseNumber === 3);
    expect(neutral?.sentiment).toBe('NEUTRAL');
    expect(neutral?.riskLevel).toBe('LOW');
  });

  it('provides non-empty Amharic summary, key findings and recommendations that differ from English', async () => {
    const result = await analyze();

    expect(result.summaryAmharic).toEqual(expect.any(String));
    expect(result.keyFindingsAmharic).toEqual(expect.any(Array));
    expect(result.recommendationsAmharic).toEqual(expect.any(Array));
    expect(result.summaryAmharic!.length).toBeGreaterThan(0);
    expect(result.keyFindingsAmharic!.length).toBeGreaterThan(0);
    expect(result.recommendationsAmharic!.length).toBeGreaterThan(0);
    // Amharic translation should not be identical to the English summary
    expect(result.summaryAmharic).not.toBe(result.summary);
  });

  it('references clause counts in the Amharic findings', async () => {
    const result = await analyze();

    const badCount = result.clauses.filter(
      (c) => c.sentiment === 'UNFAVORABLE' || c.sentiment === 'RISKY',
    ).length;
    const goodCount = result.clauses.filter((c) => c.sentiment === 'FAVORABLE').length;

    expect(
      result.keyFindingsAmharic!.some((f) => f.includes(String(badCount))),
    ).toBe(true);
    expect(
      result.keyFindingsAmharic!.some((f) => f.includes(String(goodCount))),
    ).toBe(true);
  });

  it('computes a score within the valid range', async () => {
    const result = await analyze();

    expect(result.overallScore).toBeGreaterThanOrEqual(10);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });
});
