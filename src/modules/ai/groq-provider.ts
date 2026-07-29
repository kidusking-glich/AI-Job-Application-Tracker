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
    const isAmharic = language?.toUpperCase() === 'AMHARIC';

    // --- System prompt with Ethiopian legal context ---
    const systemPrompt = [
      'You are an expert Ethiopian contract analyst with deep knowledge of Ethiopian law.',
      'You analyze contracts in both English and Amharic (\u12A0\u121B\u122D\u129B).',
      '',
      '=== ETHIOPIAN LEGAL FRAMEWORK ===',
      'You must analyze contracts against these key Ethiopian laws:',
      '1. Ethiopian Civil Code of 1960 (Articles 1675-2026) - governs all contracts.',
      '   Article 1675: A contract is "an agreement whereby two or more persons create,',
      '   vary or extinguish obligations." Article 1731: A valid contract is "law between the parties."',
      '2. Labour Proclamation No. 1156/2019 - governs employment contracts:',
      '   - Max 8 hrs/day or 48 hrs/week',
      '   - Annual leave: 16 working days minimum (first year)',
      '   - Termination requires justifiable grounds + notice (30-90 days by tenure)',
      '   - Severance pay: 30 days wages for first year + 10 days each additional year',
      '   - Probation: max 60 working days',
      '3. Trade Competition and Consumers Protection Proclamation No. 813/2013',
      '4. Urban Lease Proclamations (e.g., No. 1320/2024)',
      '',
      '=== COMMON UNFAIR CLAUSES IN ETHIOPIAN CONTRACTS ===',
      'Flag these as UNFAVORABLE or RISKY:',
      '- Unilateral termination rights (only one party can terminate without cause)',
      '- Excessive penalty clauses (Art. 1893 allows courts to reduce penalties)',
      '- Liability waivers for negligence (especially safety/health duties)',
      '- Binding mandatory arbitration waiving access to Ethiopian courts',
      '- Non-compete clauses without time/geographic limits or compensation',
      '- Waiver of statutory rights (labor law protections, consumer rights)',
      '- Unilateral price/term modification without notice or consent',
      '- Exclusive jurisdiction in foreign courts making it impractical to sue',
      '',
      '=== AMHARIC LEGAL TERMINOLOGY ===',
      'When analyzing Amharic contracts, recognize these key terms:',
      '- \u12C3\u120D (W\u00E9l) = Contract | \u1235\u121D\u135D\u1295\u1275 (Simimnet) = Agreement',
      '- \u130D\u1300\u1273 (Gid\u00E9ta) = Obligation | \u134D\u1243\u12F5 (Fikad) = Consent',
      '- \u1309\u1300\u1275 (Gudat) = Damage/Loss | \u12AA\u1233\u122B (Kisara) = Compensation',
      '- \u12CB\u1235\u1272\u1293 (Wastina) = Guarantee/Warranty',
      '- \u12A0\u1235\u130D\u12F3\u130C \u1201\u1294\u1273 (Asgedaj Huneta) = Force Majeure',
      '- \u12AD\u134D\u120D (Kifil) = Clause/Section',
      '- \u12F0\u1218\u12C8\u129D (Demewoz) = Salary/Wages',
      '- \u1240\u1228\u134D\u1275 (Erefet) = Leave',
      '- \u1270\u1240\u1323\u122A (Teketari) = Employee',
      '- \u12A0\u1230\u122A (Aseri) = Employer',
      '- \u121B\u1235\u1273\u12CB\u1240\u1175\u12EB (Mastawekia) = Notice',
      '- \u12C3\u120D \u121B\u1240\u1275\u1228\u1295\u1275 (Wel Maqweret) = Termination',
      '',
      '=== ANALYSIS INSTRUCTIONS ===',
      'For each clause determine:',
      '1. sentiment: FAVORABLE (protects recipient), NEUTRAL (standard),',
      '   UNFAVORABLE (harms recipient), RISKY (contains dangerous language)',
      '2. riskLevel: LOW, MEDIUM, HIGH, or CRITICAL based on Ethiopian legal context',
      '3. explanation: 2-3 sentence analysis referencing relevant Ethiopian law',
      '4. suggestion: Specific negotiation advice or alternative wording',
      '5. severity: 1-10 (10 = most severe impact under Ethiopian law)',
      '',
      'Also provide:',
      '- overallScore: 1-100 (higher = more favorable under Ethiopian legal standards)',
      '- riskLevel: Overall contract risk level',
      '- summary: Overall assessment',
      '- keyFindings: 1-3 most important findings',
      '- recommendations: 1-3 actionable next steps',
      '',
      'CRITICAL: Respond with valid JSON only. No markdown, no code fences.',
      'Use this exact JSON structure:',
      JSON.stringify({
        overallScore: 0,
        riskLevel: 'LOW',
        summary: 'string',
        keyFindings: ['string'],
        recommendations: ['string'],
        clauses: [
          {
            clauseNumber: 0,
            title: 'string',
            content: 'string',
            sentiment: 'FAVORABLE',
            riskLevel: 'LOW',
            explanation: 'string',
            suggestion: 'string',
            severity: 0,
          },
        ],
      }),
    ].join('\n');

    // --- User prompt with contract content ---
    const clauseText = clauses
      .map((c) => {
        const label = isAmharic
          ? `ክፍል ${c.clauseNumber}${c.title ? ` - ${c.title}` : ''}`
          : `Clause ${c.clauseNumber}${c.title ? ` - ${c.title}` : ''}`;
        return `${label}:\n${c.content}`;
      })
      .join('\n\n');

    const langNote = isAmharic
      ? 'This contract is in Amharic (አማርኛ). Analyze it using Ethiopian legal standards and the Amharic legal terminology.'
      : 'This contract is in English. Analyze it using Ethiopian legal standards.';

    const userPrompt = [
      `Contract Title: ${title}`,
      `Language: ${language}`,
      langNote,
      '',
      'Contract Clauses:',
      clauseText,
      '',
      'Analyze this contract against Ethiopian law and return the JSON analysis as specified.',
    ].join('\n');

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

      const responseText = completion.choices[0]?.message?.content || '{}';
      const result = JSON.parse(responseText) as ContractAnalysisResult;
      return this.normalizeResult(result, clauses);
    } catch (error) {
      this.logger.error(`Groq API call failed: ${error.message}`);
      throw new Error(
        `AI analysis failed: ${error.message}. Please check your GROQ_API_KEY and try again.`,
      );
    }
  }

  private normalizeResult(
    result: any,
    originalClauses: ClauseAnalysisInput[],
  ): ContractAnalysisResult {
    if (!result.clauses || !Array.isArray(result.clauses)) {
      result.clauses = [];
    }

    const normalizedClauses: AnalyzedClause[] = originalClauses.map(
      (original) => {
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
            aiClause.explanation || 'No specific analysis provided for this clause.',
          suggestion:
            aiClause.suggestion || 'Review this clause carefully in the context of your agreement.',
          severity: Math.min(10, Math.max(1, aiClause.severity || 3)),
        };
      },
    );

    return {
      overallScore: Math.min(100, Math.max(0, result.overallScore || 50)),
      riskLevel: this.normalizeRiskLevel(result.riskLevel),
      summary: result.summary || 'Analysis completed. Review the clause-by-clause breakdown below.',
      keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : [],
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
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
