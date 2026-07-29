import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, ClauseAnalysisInput, ContractAnalysisResult, AnalyzedClause } from './ai-types';

@Injectable()
export class GroqAiProvider extends AiProvider {
  private readonly logger = new Logger(GroqAiProvider.name);
  private groqClient: any = null;
  private model: string;

  constructor(private configService: ConfigService) {
    super();
    this.model = this.configService.get<string>('GROQ_MODEL', 'llama-3.3-70b-versatile');
  }

  /**
   * Lazy-initialize the Groq client (only when needed).
   */
  private getClient(): any {
    if (!this.groqClient) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Groq = require('groq-sdk');
      this.groqClient = new Groq({
        apiKey: this.configService.get<string>('GROQ_API_KEY'),
      });
    }
    return this.groqClient;
  }

  async analyzeContract(
    title: string,
    content: string,
    clauses: ClauseAnalysisInput[],
    language: string,
  ): Promise<ContractAnalysisResult> {
    this.logger.log(
      `Groq analyzing contract: "${title}" (${language}) with ${clauses.length} clauses, model: ${this.model}`,
    );

    const client = this.getClient();

    // Build the system prompt that instructs the model to return JSON
    const systemPrompt = `You are an expert Ethiopian contract analyst specializing in Ethiopian law and business practices. You analyze contracts in both English and Amharic.

Analyze the provided contract and each of its clauses. For each clause, determine:
1. sentiment: Is this clause FAVORABLE, NEUTRAL, UNFAVORABLE, or RISKY for the person receiving this contract?
2. riskLevel: LOW, MEDIUM, HIGH, or CRITICAL
3. explanation: A clear explanation of why this clause is good or bad (2-3 sentences)
4. suggestion: For unfavorable/risky clauses, suggest what to negotiate. For favorable ones, explain why it's good.
5. severity: A number 1-10 (10 = most severe)

Also provide:
- overallScore: A score 1-100 for the overall contract (higher = better for the recipient)
- riskLevel: Overall risk level
- summary: A brief overall assessment
- keyFindings: Array of 1-3 key findings
- recommendations: Array of 1-3 actionable recommendations

IMPORTANT: You MUST respond with valid JSON only, no markdown, no code fences. Use this exact JSON structure:
{
  "overallScore": number,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "summary": "string",
  "keyFindings": ["string", ...],
  "recommendations": ["string", ...],
  "clauses": [
    {
      "clauseNumber": number,
      "title": "string",
      "content": "string",
      "sentiment": "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE" | "RISKY",
      "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "explanation": "string",
      "suggestion": "string",
      "severity": number
    }
  ]
}`;

    // Build the user prompt with the contract content
    const clauseText = clauses
      .map(
        (c) =>
          `Clause ${c.clauseNumber}${c.title ? ` - ${c.title}` : ''}:\n${c.content}`,
      )
      .join('\n\n');

    const userPrompt = `Contract Title: ${title}
Language: ${language}

Contract Clauses:
${clauseText}

Analyze this contract and return the JSON analysis as specified.`;

    try {
      const completion = await client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 8192,
      });

      const responseText =
        completion.choices[0]?.message?.content || '{}';

      // Parse the JSON response
      const result = JSON.parse(responseText) as ContractAnalysisResult;

      // Validate and normalize the result
      return this.normalizeResult(result, clauses);
    } catch (error) {
      this.logger.error(`Groq API call failed: ${error.message}`);
      throw new Error(
        `AI analysis failed: ${error.message}. Please check your GROQ_API_KEY and try again.`,
      );
    }
  }

  /**
   * Validate and normalize the AI response to ensure it matches our expected types.
   */
  private normalizeResult(
    result: any,
    originalClauses: ClauseAnalysisInput[],
  ): ContractAnalysisResult {
    // Ensure clauses array exists
    if (!result.clauses || !Array.isArray(result.clauses)) {
      result.clauses = [];
    }

    // Map each analyzed clause back to original clause numbers
    const normalizedClauses: AnalyzedClause[] = originalClauses.map(
      (original, index) => {
        const aiClause = result.clauses.find(
          (c: any) => c.clauseNumber === original.clauseNumber,
        ) || {};

        return {
          clauseNumber: original.clauseNumber,
          title: original.title || aiClause.title || `Clause ${original.clauseNumber}`,
          content: original.content,
          sentiment: this.normalizeSentiment(aiClause.sentiment),
          riskLevel: this.normalizeRiskLevel(aiClause.riskLevel),
          explanation:
            aiClause.explanation ||
            'No specific analysis provided for this clause.',
          suggestion:
            aiClause.suggestion ||
            'Review this clause carefully in the context of your agreement.',
          severity: Math.min(10, Math.max(1, aiClause.severity || 3)),
        };
      },
    );

    return {
      overallScore: Math.min(100, Math.max(0, result.overallScore || 50)),
      riskLevel: this.normalizeRiskLevel(result.riskLevel),
      summary:
        result.summary ||
        'Analysis completed. Review the clause-by-clause breakdown below.',
      keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : [],
      recommendations: Array.isArray(result.recommendations)
        ? result.recommendations
        : [],
      clauses: normalizedClauses,
    };
  }

  private normalizeSentiment(
    value: string | undefined,
  ): 'FAVORABLE' | 'NEUTRAL' | 'UNFAVORABLE' | 'RISKY' {
    const valid = ['FAVORABLE', 'NEUTRAL', 'UNFAVORABLE', 'RISKY'];
    if (value && valid.includes(value.toUpperCase())) {
      return value.toUpperCase() as any;
    }
    return 'NEUTRAL';
  }

  private normalizeRiskLevel(
    value: string | undefined,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const valid = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (value && valid.includes(value.toUpperCase())) {
      return value.toUpperCase() as any;
    }
    return 'LOW';
  }
}
