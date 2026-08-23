/**
 * Client-side file parser for PDF, DOCX, PPTX, and text files.
 * Extracts readable text content from binary document formats.
 */

// ── PDF parsing via pdfjs-dist ──────────────────────────────────────────────
async function parsePDF(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');

  // Use the bundled worker
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    if (pageText.trim()) {
      pages.push(`--- Page ${i} ---\n${pageText.trim()}`);
    }
  }

  return pages.join('\n\n') || '(No readable text found in PDF)';
}

// ── DOCX parsing via mammoth ────────────────────────────────────────────────
async function parseDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value?.trim() || '(No readable text found in DOCX)';
}

// ── PPTX parsing via JSZip (PPTX = ZIP of XML slides) ──────────────────────
async function parsePPTX(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? '0');
      return numA - numB;
    });

  const slides: string[] = [];
  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async('text');
    // Extract text from <a:t> tags (Office Open XML text runs)
    const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const slideText = textMatches
      .map(match => {
        const content = match.replace(/<[^>]+>/g, '');
        return content;
      })
      .join(' ')
      .trim();
    if (slideText) {
      const slideNum = slidePath.match(/slide(\d+)/)?.[1] ?? '?';
      slides.push(`--- Slide ${slideNum} ---\n${slideText}`);
    }
  }

  return slides.join('\n\n') || '(No readable text found in PPTX)';
}

// ── Legacy binary formats (DOC, XLS, PPT — best-effort) ────────────────────
async function parseLegacyBinary(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  // Extract printable ASCII strings (runs of 4+ printable chars)
  const strings: string[] = [];
  let current = '';
  for (const byte of bytes) {
    if (byte >= 0x20 && byte <= 0x7E) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= 4) strings.push(current);
      current = '';
    }
  }
  if (current.length >= 4) strings.push(current);

  const text = strings
    .filter(s => !/^[^a-zA-Z]*$/.test(s)) // Filter out pure non-letter strings
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.slice(0, 8000) || `(Could not extract text from legacy ${file.name} format)`;
}

// ── Plain text files ────────────────────────────────────────────────────────
async function parsePlainText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = (e.target?.result as string) || '';
      // Strip control characters but keep newlines/tabs
      const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, '');
      resolve(cleaned.slice(0, 8000));
    };
    reader.onerror = () => resolve('(Failed to read file)');
    reader.readAsText(file);
  });
}

// ── Main entry point ────────────────────────────────────────────────────────
export async function parseFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  try {
    switch (ext) {
      case 'pdf':
        return await parsePDF(file);
      case 'docx':
        return await parseDOCX(file);
      case 'pptx':
        return await parsePPTX(file);
      case 'doc':
      case 'ppt':
      case 'xls':
        return await parseLegacyBinary(file);
      case 'xlsx': {
        // XLSX is also a ZIP of XML — extract shared strings
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const sharedStrings = zip.files['xl/sharedStrings.xml'];
        if (sharedStrings) {
          const xml = await sharedStrings.async('text');
          const texts = xml.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
          const content = texts.map(t => t.replace(/<[^>]+>/g, '')).join(' | ');
          return content.slice(0, 8000) || '(No readable text in XLSX)';
        }
        return await parseLegacyBinary(file);
      }
      default:
        // Treat as plain text (.txt, .md, .json, .csv, .js, .ts, .py, .html, .css, etc.)
        return await parsePlainText(file);
    }
  } catch (err) {
    console.error(`Failed to parse ${file.name}:`, err);
    // Fallback: try reading as text
    try {
      return await parsePlainText(file);
    } catch {
      return `(Failed to parse ${file.name}: ${(err as Error).message})`;
    }
  }
}
