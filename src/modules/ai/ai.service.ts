import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GroqAiProvider } from './groq-provider';
import {
  AiProvider,
  ClauseAnalysisInput,
  ContractAnalysisResult,
  AnalyzedClause,
} from './ai-types';

export type { ClauseAnalysisInput, ContractAnalysisResult, AnalyzedClause };
export { AiProvider };

/**
 * Mock AI provider for development/demo purposes.
 * Replace this with real LLM integration (OpenAI, Claude, etc.)
 */
@Injectable()
export class MockAiProvider extends AiProvider {
  private readonly logger = new Logger(MockAiProvider.name);

  async analyzeContract(
    title: string,
    content: string,
    clauses: ClauseAnalysisInput[],
    language: string,
  ): Promise<ContractAnalysisResult> {
    this.logger.log(`Analyzing contract: "${title}" (${language})`);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const analyzedClauses: AnalyzedClause[] = clauses.map((clause) => {
      const lowerContent = clause.content.toLowerCase();
      const isBad =
        lowerContent.includes('not liable') ||
        lowerContent.includes('no responsibility') ||
        lowerContent.includes('indemnify') ||
        lowerContent.includes('waive') ||
        lowerContent.includes('terminate without notice') ||
        lowerContent.includes('binding arbitration') ||
        lowerContent.includes('non-compete') ||
        lowerContent.includes('exclusive') ||
        lowerContent.includes('forfeiture') ||
        lowerContent.includes('penalty');

      const isGood =
        lowerContent.includes('mutual') ||
        lowerContent.includes('reasonable') ||
        lowerContent.includes('good faith') ||
        lowerContent.includes('pro-rata') ||
        lowerContent.includes('notice period') ||
        lowerContent.includes('confidentiality') ||
        lowerContent.includes('limited liability');

      if (isBad) {
        return {
          clauseNumber: clause.clauseNumber,
          title: clause.title || `Clause ${clause.clauseNumber}`,
          content: clause.content,
          sentiment: 'UNFAVORABLE' as const,
          riskLevel: 'HIGH' as const,
          explanation:
            'This clause contains language that shifts significant risk or liability onto you. It uses terms that strongly favor the other party and could lead to unfavorable outcomes.',
          suggestion:
            'Consider negotiating to remove or modify the unfavorable terms. Seek to add mutuality and balance to the obligations.',
          explanationAmharic:
            'ይህ አንቀጽ በእርስዎ ላይ ከፍተኛ ስጋት ወይም ኃላፊነት የሚጭን ቋንቋ ይዟል። የሌላውን ወገን በጥብቅ የሚደግፍ እና ወደ ማይመቹ ውጤቶች ሊያመራ ይችላል።',
          suggestionAmharic:
            'የማይመቹትን ውሎች ለማስወገድ ወይም ለማስተካከል መደራደር ያስቡ። በኃላፊነቶቹ ላይ ሚዛናዊነት እና የጋራነት እንዲኖር ይጠይቁ።',
          severity: 8,
        };
      }

      if (isGood) {
        return {
          clauseNumber: clause.clauseNumber,
          title: clause.title || `Clause ${clause.clauseNumber}`,
          content: clause.content,
          sentiment: 'FAVORABLE' as const,
          riskLevel: 'LOW' as const,
          explanation:
            'This clause contains balanced and fair language. It protects your interests with reasonable terms and mutual obligations.',
          suggestion:
            'This clause appears well-balanced. Maintain it as-is during negotiations.',
          explanationAmharic:
            'ይህ አንቀጽ ሚዛናዊ እና ፍትሃዊ ቋንቋ ይዟል። በተመጣጣኝ ውሎች እና የጋራ ኃላፊነት ፍላጎትዎን ይጠብቃል።',
          suggestionAmharic: 'ይህ አንቀጽ ሚዛናዊ ነው። በድርድር ጊዜ እንዳለ እንዲቆይ ያድርጉ።',
          severity: 2,
        };
      }

      return {
        clauseNumber: clause.clauseNumber,
        title: clause.title || `Clause ${clause.clauseNumber}`,
        content: clause.content,
        sentiment: 'NEUTRAL' as const,
        riskLevel: 'LOW' as const,
        explanation:
          'This clause appears to be standard language with no immediately apparent risks or exceptional benefits.',
        suggestion:
          'Review carefully in the context of your specific situation. Standard clauses can still have important implications.',
        explanationAmharic:
          'ይህ አንቀጽ መደበኛ ቋንቋ ይመስላል፤ ወዲያውኑ የሚታወቅ ስጋትም ሆነ ልዩ ጥቅም የለውም።',
        suggestionAmharic:
          'በተለየ ሁኔታዎ ውስጥ በጥንቃቄ ይገምግሙት። መደበኛ አንቀጾች እንኳ ጠቃሚ አንድምታ ሊኖራቸው ይችላል።',
        severity: 3,
      };
    });

    const badClauses = analyzedClauses.filter(
      (c) => c.sentiment === 'UNFAVORABLE' || c.sentiment === 'RISKY',
    );
    const goodClauses = analyzedClauses.filter(
      (c) => c.sentiment === 'FAVORABLE',
    );

    const totalClauses = analyzedClauses.length;
    const score = Math.max(
      10,
      Math.round(
        100 -
          (badClauses.length / Math.max(totalClauses, 1)) * 60 +
          (goodClauses.length / Math.max(totalClauses, 1)) * 10,
      ),
    );

    const riskLevel =
      score >= 80
        ? ('LOW' as const)
        : score >= 60
          ? ('MEDIUM' as const)
          : score >= 40
            ? ('HIGH' as const)
            : ('CRITICAL' as const);

    const keyFindings = [
      `Contract contains ${badClauses.length} clause(s) that may be unfavorable`,
      `Contract contains ${goodClauses.length} clause(s) that are favorable`,
      ...(badClauses.length > 0
        ? [
            `Key concern: "${badClauses[0].title}" - ${badClauses[0].explanation.substring(0, 80)}...`,
          ]
        : []),
    ];

    const recommendations = [
      ...(badClauses.length > 0
        ? [
            `Negotiate or seek legal advice on the ${badClauses.length} unfavorable clause(s) identified`,
          ]
        : []),
      'Consider having a lawyer review the full contract',
      'Keep a copy of the final signed contract for your records',
    ];

    return {
      overallScore: score,
      riskLevel,
      summary:
        badClauses.length > 0
          ? `This contract contains ${badClauses.length} clause(s) that require attention. Overall, it scores ${score}/100. We recommend reviewing the highlighted clauses carefully and consulting with a legal professional before signing.`
          : `This contract appears to be reasonably balanced. It scores ${score}/100. While no major red flags were detected, we still recommend careful review.`,
      summaryAmharic:
        badClauses.length > 0
          ? `ይህ ውል ${badClauses.length} ትኩረት የሚሹ አንቀጾችን ይዟል። በአጠቃላይ ከ100 ${score} ያስመዘገበ ሲሆን፣ የተጠቆሙትን አንቀጾች በጥንቃቄ እንዲገመግሙ እና ከመፈረምዎ በፊት የህግ ባለሙያ እንዲያማክሩ እንመክራለን።`
          : `ይህ ውል በተመጣጣኝ ሁኔታ ሚዛናዊ ይመስላል። ከ100 ${score} ያስመዘገበ ሲሆን፣ ምንም ከባድ ችግር ባይታወቅም ጥንቃቄ የተሞላበት ግምገማ እንመክራለን።`,
      keyFindings,
      keyFindingsAmharic: [
        `ውሉ ${badClauses.length} የማይመቹ ሊሆኑ የሚችሉ አንቀጾችን ይዟል`,
        `ውሉ ${goodClauses.length} ጥሩ አንቀጾችን ይዟል`,
        ...(badClauses.length > 0
          ? [`ዋና ስጋት: "${badClauses[0].title}" - ይህ አንቀጽ ከፍተኛ ትኩረት ይፈልጋል`]
          : []),
      ],
      recommendations,
      recommendationsAmharic: [
        ...(badClauses.length > 0
          ? [`በተገኙት ${badClauses.length} የማይመቹ አንቀጾች ላይ መደራደር ወይም የህግ ምክር ይጠይቁ`]
          : []),
        'ሙሉውን ውል ጠበቃ እንዲገመግሙት ያድርጉ',
        'የመጨረሻውን የተፈረመ ውል ቅጂ ለመዛግብት ያስቀምጡ',
      ],
      clauses: analyzedClauses,
    };
  }
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private provider: AiProvider;

  constructor(private configService: ConfigService) {
    // Default to mock provider until we check env vars
    this.provider = new MockAiProvider();
  }

  /**
   * On module init, check if a real AI provider is configured.
   */
  onModuleInit() {
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (groqKey) {
      this.provider = new GroqAiProvider(this.configService);
      const model = this.configService.get<string>(
        'GROQ_MODEL',
        'llama-3.3-70b-versatile',
      );
      this.logger.log(
        `AI Service initialized with Groq provider (model: ${model})`,
      );
    } else {
      this.logger.log(
        'AI Service initialized with Mock provider (set GROQ_API_KEY for real AI)',
      );
    }
  }

  /**
   * Set a custom AI provider (for programmatic switching)
   */
  setProvider(provider: AiProvider) {
    this.provider = provider;
    this.logger.log('AI Provider updated');
  }

  async analyzeContract(
    title: string,
    content: string,
    clauses: ClauseAnalysisInput[],
    language: string = 'ENGLISH',
  ): Promise<ContractAnalysisResult> {
    return this.provider.analyzeContract(title, content, clauses, language);
  }
}
