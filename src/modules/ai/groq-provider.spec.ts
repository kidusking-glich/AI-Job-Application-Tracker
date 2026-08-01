import { GroqAiProvider } from './groq-provider';
import { AiError, AiErrorCode } from './ai-types';
import type { ClauseAnalysisInput } from './ai-types';

describe('GroqAiProvider', () => {
  let provider: GroqAiProvider;
  let mockCreate: jest.Mock;
  let mockClient: any;

  const configService = {
    get: jest.fn((_key: string, defaultValue?: string) => defaultValue),
  } as any;

  const clauses: ClauseAnalysisInput[] = [
    {
      clauseNumber: 1,
      title: 'Termination',
      content: 'Either party may terminate this agreement without cause.',
    },
    {
      clauseNumber: 2,
      title: 'Non-Compete',
      content:
        'Employee shall not compete with the company for a period of time.',
    },
  ];

  beforeEach(() => {
    mockCreate = jest.fn();
    mockClient = {
      chat: { completions: { create: mockCreate } },
    };
    provider = new GroqAiProvider(configService);
    // Inject the mock client so getClient() does not require('groq-sdk')
    (provider as any).groqClient = mockClient;
  });

  function mockCompletion(content: string) {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content } }],
    });
  }

  function mockRejection(
    status: number | undefined,
    errorBody?: { message?: string },
  ) {
    const err: any = new Error(errorBody?.message || 'API error');
    if (status !== undefined) err.status = status;
    err.error = errorBody;
    mockCreate.mockRejectedValue(err);
  }

  describe('error classification (classifyError)', () => {
    it('maps a 429 quota error to AI_QUOTA_EXCEEDED', async () => {
      mockRejection(429, {
        message: 'rate_limit_exceeded: You exceeded your current quota',
      });

      const error = await provider
        .analyzeContract('Test', 'content', clauses, 'ENGLISH')
        .catch((e) => e);

      expect(error).toBeInstanceOf(AiError);
      expect(error.code).toBe(AiErrorCode.QUOTA_EXCEEDED);
    });

    it('maps a 429 without quota wording to AI_RATE_LIMIT', async () => {
      mockRejection(429, { message: 'Too many requests, please slow down' });

      await expect(
        provider.analyzeContract('Test', 'content', clauses, 'ENGLISH'),
      ).rejects.toMatchObject({ code: AiErrorCode.RATE_LIMIT });
    });

    it('maps a 401 to AI_INVALID_API_KEY', async () => {
      mockRejection(401, { message: 'Invalid API key' });

      await expect(
        provider.analyzeContract('Test', 'content', clauses, 'ENGLISH'),
      ).rejects.toMatchObject({ code: AiErrorCode.INVALID_API_KEY });
    });

    it('maps a 403 to AI_INVALID_API_KEY', async () => {
      mockRejection(403, { message: 'Forbidden' });

      await expect(
        provider.analyzeContract('Test', 'content', clauses, 'ENGLISH'),
      ).rejects.toMatchObject({ code: AiErrorCode.INVALID_API_KEY });
    });

    it('maps a 5xx error to AI_SERVICE_UNAVAILABLE', async () => {
      mockRejection(503, { message: 'Service Unavailable' });

      await expect(
        provider.analyzeContract('Test', 'content', clauses, 'ENGLISH'),
      ).rejects.toMatchObject({ code: AiErrorCode.SERVICE_UNAVAILABLE });
    });

    it('maps network/connection errors (no status) to AI_ERROR', async () => {
      mockRejection(undefined, { message: 'ECONNREFUSED connection refused' });

      await expect(
        provider.analyzeContract('Test', 'content', clauses, 'ENGLISH'),
      ).rejects.toMatchObject({ code: AiErrorCode.GENERIC });
    });

    it('maps JSON parse failures to AI_ERROR', async () => {
      mockCompletion('this is not valid json {{');

      await expect(
        provider.analyzeContract('Test', 'content', clauses, 'ENGLISH'),
      ).rejects.toMatchObject({ code: AiErrorCode.GENERIC });
    });
  });

  describe('Amharic normalization (normalizeResult)', () => {
    it('preserves Amharic fields when the AI returns them', async () => {
      mockCompletion(
        JSON.stringify({
          overallScore: 75,
          riskLevel: 'MEDIUM',
          summary: 'English summary',
          summaryAmharic: 'የአማርኛ ማጠቃለያ',
          keyFindings: ['English finding'],
          keyFindingsAmharic: ['የአማርኛ ግኝት'],
          recommendations: ['English rec'],
          recommendationsAmharic: ['የአማርኛ ምክር'],
          clauses: [
            {
              clauseNumber: 1,
              sentiment: 'UNFAVORABLE',
              riskLevel: 'HIGH',
              explanation: 'English explanation',
              explanationAmharic: 'የአማርኛ ማብራሪያ',
              suggestion: 'English suggestion',
              suggestionAmharic: 'የአማርኛ ሀሳብ',
              severity: 8,
            },
          ],
        }),
      );

      const result = await provider.analyzeContract(
        'Test',
        'content',
        clauses,
        'ENGLISH',
      );

      expect(result.summaryAmharic).toBe('የአማርኛ ማጠቃለያ');
      expect(result.keyFindingsAmharic).toEqual(['የአማርኛ ግኝት']);
      expect(result.recommendationsAmharic).toEqual(['የአማርኛ ምክር']);
      expect(result.clauses[0].explanationAmharic).toBe('የአማርኛ ማብራሪያ');
      expect(result.clauses[0].suggestionAmharic).toBe('የአማርኛ ሀሳብ');
    });

    it('falls back to English content when Amharic fields are missing', async () => {
      mockCompletion(
        JSON.stringify({
          overallScore: 60,
          riskLevel: 'LOW',
          summary: 'English summary',
          keyFindings: ['English finding'],
          recommendations: ['English rec'],
          clauses: [
            {
              clauseNumber: 1,
              sentiment: 'FAVORABLE',
              riskLevel: 'LOW',
              explanation: 'English explanation',
              suggestion: 'English suggestion',
              severity: 2,
            },
          ],
        }),
      );

      const result = await provider.analyzeContract(
        'Test',
        'content',
        clauses,
        'ENGLISH',
      );

      expect(result.summaryAmharic).toBe('English summary');
      expect(result.keyFindingsAmharic).toEqual(['English finding']);
      expect(result.recommendationsAmharic).toEqual(['English rec']);
      expect(result.clauses[0].explanationAmharic).toBe('English explanation');
      expect(result.clauses[0].suggestionAmharic).toBe('English suggestion');
    });

    it('uses Amharic clause labels in the prompt for Amharic contracts', async () => {
      mockCompletion(
        JSON.stringify({
          overallScore: 50,
          riskLevel: 'LOW',
          summary: 's',
          keyFindings: [],
          recommendations: [],
          clauses: [],
        }),
      );

      await provider.analyzeContract('ውል', 'content', clauses, 'AMHARIC');

      const userPrompt = mockCreate.mock.calls[0][0].messages[1]
        .content as string;
      expect(userPrompt).toContain('ክፍል 1');
      expect(userPrompt).toContain('አማርኛ');
    });

    it('uses English clause labels in the prompt for English contracts', async () => {
      mockCompletion(
        JSON.stringify({
          overallScore: 50,
          riskLevel: 'LOW',
          summary: 's',
          keyFindings: [],
          recommendations: [],
          clauses: [],
        }),
      );

      await provider.analyzeContract('Contract', 'content', clauses, 'ENGLISH');

      const userPrompt = mockCreate.mock.calls[0][0].messages[1]
        .content as string;
      expect(userPrompt).toContain('Clause 1');
      expect(userPrompt).toContain('English');
      expect(userPrompt).not.toContain('ክፍል');
    });

    it('falls back to English per-clause when one clause lacks Amharic content', async () => {
      mockCompletion(
        JSON.stringify({
          overallScore: 70,
          riskLevel: 'MEDIUM',
          summary: 's',
          keyFindings: [],
          recommendations: [],
          clauses: [
            {
              clauseNumber: 1,
              sentiment: 'UNFAVORABLE',
              riskLevel: 'HIGH',
              explanation: 'English explanation one',
              explanationAmharic: 'የአማርኛ ማብራሪያ አንድ',
              suggestion: 'English suggestion one',
              suggestionAmharic: 'የአማርኛ ሀሳብ አንድ',
              severity: 7,
            },
            {
              clauseNumber: 2,
              sentiment: 'NEUTRAL',
              riskLevel: 'LOW',
              explanation: 'English explanation two',
              suggestion: 'English suggestion two',
              severity: 3,
            },
          ],
        }),
      );

      const result = await provider.analyzeContract(
        'Test',
        'content',
        clauses,
        'ENGLISH',
      );

      // Clause 1 keeps its Amharic translation
      expect(result.clauses[0].explanationAmharic).toBe('የአማርኛ ማብራሪያ አንድ');
      expect(result.clauses[0].suggestionAmharic).toBe('የአማርኛ ሀሳብ አንድ');
      // Clause 2 falls back to English
      expect(result.clauses[1].explanationAmharic).toBe(
        'English explanation two',
      );
      expect(result.clauses[1].suggestionAmharic).toBe(
        'English suggestion two',
      );
    });
  });

  describe('result normalization defaults', () => {
    it('clamps overallScore and severity, normalizes invalid sentiment/risk', async () => {
      mockCompletion(
        JSON.stringify({
          overallScore: 150,
          riskLevel: 'EXTREME',
          summary: 's',
          keyFindings: [],
          recommendations: [],
          clauses: [
            {
              clauseNumber: 1,
              sentiment: 'GOOD',
              riskLevel: 'MAX',
              severity: 99,
            },
          ],
        }),
      );

      const result = await provider.analyzeContract(
        'Test',
        'content',
        clauses,
        'ENGLISH',
      );

      expect(result.overallScore).toBe(100);
      expect(result.riskLevel).toBe('LOW');
      expect(result.clauses[0].sentiment).toBe('NEUTRAL');
      expect(result.clauses[0].riskLevel).toBe('LOW');
      expect(result.clauses[0].severity).toBe(10);
    });

    it('fills defaults for clauses missing from the AI result', async () => {
      mockCompletion(
        JSON.stringify({
          overallScore: 50,
          riskLevel: 'LOW',
          summary: 's',
          keyFindings: [],
          recommendations: [],
          clauses: [],
        }),
      );

      const result = await provider.analyzeContract(
        'Test',
        'content',
        clauses,
        'ENGLISH',
      );

      expect(result.clauses).toHaveLength(2);
      expect(result.clauses[0].explanation).toBe(
        'No specific analysis provided for this clause.',
      );
      expect(result.clauses[0].severity).toBe(3);
      expect(result.clauses[1].sentiment).toBe('NEUTRAL');
    });

    it('clamps negative overallScore and severity to their floors', async () => {
      mockCompletion(
        JSON.stringify({
          overallScore: -10,
          riskLevel: 'LOW',
          summary: 's',
          keyFindings: [],
          recommendations: [],
          clauses: [
            {
              clauseNumber: 1,
              sentiment: 'FAVORABLE',
              riskLevel: 'LOW',
              explanation: 'e',
              suggestion: 's',
              severity: -5,
            },
          ],
        }),
      );

      const result = await provider.analyzeContract(
        'Test',
        'content',
        clauses,
        'ENGLISH',
      );

      expect(result.overallScore).toBe(0);
      expect(result.clauses[0].severity).toBe(1);
    });
  });
});
