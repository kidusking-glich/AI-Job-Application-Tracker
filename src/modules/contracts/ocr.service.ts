import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Run OCR on an image file (PNG, JPEG) using Tesseract.js.
   * Supports both English and Amharic text recognition.
   */
  async recognizeImage(
    filePath: string,
    language: string = 'eng',
  ): Promise<string | null> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      this.logger.warn(`Image not found for OCR: ${absolutePath}`);
      return null;
    }

    try {
      this.logger.log(
        `Starting OCR on image: ${absolutePath} (lang: ${language})`,
      );
      const result = await this.runTesseract(absolutePath, language);
      this.logger.log(`OCR completed: ${result.length} characters extracted`);
      return result;
    } catch (error) {
      const message = error.message || String(error);
      // Check if it's a language model download error
      if (
        message.includes('lang') ||
        message.includes('traineddata') ||
        message.includes('download')
      ) {
        this.logger.error(
          `OCR failed - language model could not be loaded for "${language}". ` +
            `The first OCR call downloads the language model which may fail without internet. Error: ${message}`,
        );
      } else {
        this.logger.error(`OCR failed for ${filePath}: ${message}`);
      }
      return null;
    }
  }

  /**
   * Check if a PDF is likely scanned (image-based) by checking
   * if pdftoppm is available on the system.
   */
  isPdfToImageAvailable(): boolean {
    try {
      execSync('which pdftoppm', { stdio: 'ignore' });
      return true;
    } catch {
      try {
        execSync('which gs', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Convert a PDF to images and run OCR on each page.
   * This uses system tools (pdftoppm or ghostscript) to render PDF pages as images.
   */
  async recognizePdf(
    filePath: string,
    language: string = 'eng',
  ): Promise<string | null> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      this.logger.warn(`PDF not found for OCR: ${absolutePath}`);
      return null;
    }

    // Create a temp directory for page images
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-pages-'));
    let allText = '';

    try {
      this.logger.log(`Converting PDF to images for OCR: ${absolutePath}`);

      let pageCount = 0;

      // Try pdftoppm first (poppler-utils)
      try {
        const outputPrefix = path.join(tempDir, 'page');
        execSync(`pdftoppm -png -r 300 "${absolutePath}" "${outputPrefix}"`, {
          stdio: 'ignore',
          timeout: 60000,
        });
        // Count generated images
        const files = fs.readdirSync(tempDir);
        pageCount = files.filter(
          (f) => f.startsWith('page-') || f.startsWith('page'),
        ).length;
      } catch {
        // Try ghostscript as fallback
        try {
          const outputFile = path.join(tempDir, 'page-%d.png');
          execSync(
            `gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r300 -sOutputFile="${outputFile}" "${absolutePath}"`,
            { stdio: 'ignore', timeout: 120000 },
          );
          const files = fs.readdirSync(tempDir);
          pageCount = files.filter((f) => f.endsWith('.png')).length;
        } catch {
          this.logger.error(
            `PDF conversion failed: No tools available (pdftoppm, gs)`,
          );
          return null;
        }
      }

      if (pageCount === 0) {
        this.logger.warn('No pages were extracted from the PDF');
        return null;
      }

      this.logger.log(`Extracted ${pageCount} pages, running OCR...`);

      // OCR each page image
      const pageFiles = fs
        .readdirSync(tempDir)
        .filter((f) => f.endsWith('.png'))
        .sort();

      for (const pageFile of pageFiles) {
        const pagePath = path.join(tempDir, pageFile);
        this.logger.log(`OCR on page: ${pageFile}`);
        try {
          const pageText = await this.runTesseract(pagePath, language);
          if (pageText && pageText.trim()) {
            allText += `\n\n--- Page ${pageFiles.indexOf(pageFile) + 1} ---\n\n${pageText}`;
          }
        } catch (pageError) {
          this.logger.warn(
            `Failed to OCR page ${pageFile}: ${pageError.message}`,
          );
        }
      }

      this.logger.log(
        `PDF OCR completed: ${pageCount} pages, ${allText.length} total characters`,
      );
      return allText.trim() || null;
    } catch (error) {
      this.logger.error(`PDF OCR failed: ${error.message}`);
      return null;
    } finally {
      // Cleanup temp files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Run Tesseract.js OCR on an image file.
   * Dynamically imports and manages the Tesseract worker.
   */
  private async runTesseract(
    imagePath: string,
    language: string,
  ): Promise<string> {
    const Tesseract = await import('tesseract.js');

    // Map our language codes to Tesseract language codes
    const tesseractLang = this.mapLanguage(language);

    const worker = await Tesseract.createWorker(tesseractLang);

    try {
      const { data } = await worker.recognize(imagePath);
      return (data.text || '').trim();
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Map our language codes to Tesseract.js language codes.
   * Amharic support: tesseract.js uses 'amh' for Amharic via tessdata.
   */
  private mapLanguage(language: string): string {
    switch (language.toUpperCase()) {
      case 'AMHARIC':
        return 'amh'; // Tesseract Amharic language code
      case 'ENGLISH':
      default:
        return 'eng';
    }
  }
}
