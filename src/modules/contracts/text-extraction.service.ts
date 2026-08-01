import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { OcrService } from './ocr.service';

@Injectable()
export class TextExtractionService {
  private readonly logger = new Logger(TextExtractionService.name);

  constructor(private ocrService: OcrService) {}

  /**
   * Extract text from a file based on its extension.
   * Supports PDF, DOCX, TXT, PNG, JPEG with OCR fallback for scanned content.
   */
  async extractText(
    filePath: string,
    originalName?: string,
    language?: string,
  ): Promise<string | null> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      this.logger.warn(`File not found for extraction: ${absolutePath}`);
      return null;
    }

    const ext = (
      path.extname(originalName || filePath) || path.extname(filePath)
    ).toLowerCase();
    this.logger.log(
      `Extracting text from file: ${filePath} (extension: ${ext}, lang: ${language || 'eng'})`,
    );

    try {
      switch (ext) {
        case '.pdf':
          return await this.extractFromPdf(absolutePath, language);
        case '.docx':
          return await this.extractFromDocx(absolutePath);
        case '.doc':
          return await this.extractFromDoc(absolutePath);
        case '.txt':
          return this.extractFromTxt(absolutePath);
        case '.png':
        case '.jpg':
        case '.jpeg':
          return await this.extractFromImage(absolutePath, language);
        default: {
          // For unknown types, try OCR first, then plain text
          const ocrResult = await this.ocrService.recognizeImage(
            absolutePath,
            language,
          );
          if (ocrResult && ocrResult.trim().length > 20) {
            return ocrResult;
          }
          try {
            return this.extractFromTxt(absolutePath);
          } catch {
            this.logger.warn(`Unsupported file type for extraction: ${ext}`);
            return null;
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Text extraction failed for ${filePath}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Extract text from PDF. Tries pdf-parse first for selectable text.
   * If the PDF is scanned (no selectable text), falls back to OCR.
   */
  private async extractFromPdf(
    filePath: string,
    language?: string,
  ): Promise<string> {
    // First try: extract selectable text with pdf-parse
    const selectableText = await this.tryPdfParse(filePath);

    // If we got meaningful text, use it
    if (selectableText && selectableText.trim().length >= 100) {
      this.logger.log(
        `PDF has selectable text: ${selectableText.length} characters`,
      );
      return selectableText;
    }

    // Second try: PDF might be scanned, use OCR
    this.logger.log(
      `PDF appears to be scanned (${selectableText?.length || 0} chars from text layer). Using OCR...`,
    );

    const ocrText = await this.ocrService.recognizePdf(filePath, language);

    if (ocrText && ocrText.trim().length > 0) {
      this.logger.log(
        `PDF OCR successful: ${ocrText.length} characters extracted`,
      );
      return ocrText;
    }

    // Fall back to whatever pdf-parse gave us (even if minimal)
    if (selectableText && selectableText.trim().length > 0) {
      return selectableText;
    }

    throw new Error(
      'Could not extract text from PDF. The file may be a scanned document without OCR tools available. ' +
        'Try uploading individual page images instead.',
    );
  }

  /**
   * Extract text from a PDF using pdf-parse (for selectable text).
   */
  private async tryPdfParse(filePath: string): Promise<string | null> {
    try {
      const pdfParse = (await import('pdf-parse')) as unknown as (
        dataBuffer: Buffer,
      ) => Promise<{ text: string; numpages: number }>;
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return (data.text || '').trim() || null;
    } catch (error) {
      this.logger.warn(`pdf-parse failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract text from a DOCX file using mammoth.
   */
  private async extractFromDocx(filePath: string): Promise<string> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });

    const text = result.value || '';
    this.logger.log(`DOCX extracted: ${text.length} characters`);

    if (result.messages && result.messages.length > 0) {
      for (const msg of result.messages) {
        this.logger.warn(`Mammoth warning: ${msg.message}`);
      }
    }

    return text || '';
  }

  /**
   * Extract text from old DOC files. Tries mammoth, falls back to OCR.
   */
  private async extractFromDoc(filePath: string): Promise<string> {
    try {
      return await this.extractFromDocx(filePath);
    } catch {
      // If mammoth fails, try OCR
      const ocrResult = await this.ocrService.recognizeImage(filePath);
      if (ocrResult) return ocrResult;
      return this.extractFromTxt(filePath);
    }
  }

  /**
   * Extract text from an image file using OCR.
   */
  private async extractFromImage(
    filePath: string,
    language?: string,
  ): Promise<string> {
    this.logger.log(`Running OCR on image: ${filePath}`);

    const text = await this.ocrService.recognizeImage(filePath, language);

    if (text && text.trim().length > 0) {
      this.logger.log(`Image OCR extracted: ${text.length} characters`);
      return text;
    }

    throw new Error(
      'Could not extract any text from the image. ' +
        'Ensure the image is clear and contains readable text.',
    );
  }

  /**
   * Extract text from a plain text file.
   */
  private extractFromTxt(filePath: string): string {
    const text = fs.readFileSync(filePath, 'utf-8');
    this.logger.log(`TXT extracted: ${text.length} characters`);
    return text;
  }
}
