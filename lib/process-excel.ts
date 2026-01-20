import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export interface DOAChunk {
  text: string;
  metadata: {
    rowNumber: number;
    category?: string;
    no?: string;
    limits?: string;
    shareholderApproval?: string;
    boardApproval?: string;
    ceo?: string;
    remarks?: string;
  };
}

export function processExcelFile(filePath: string): DOAChunk[] {
  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'Final DOA';
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file`);
  }

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

  const chunks: DOAChunk[] = [];
  let currentCategory = '';
  let currentSubCategory = '';
  let lastDescription = ''; // Track last description for continuation rows

  // Process each row
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const no = row[1]?.toString().trim() || '';
    const description = row[2]?.toString().trim() || '';
    const limits = row[3]?.toString().trim() || '';
    const shareholderApproval = row[4]?.toString().trim() || '';
    const boardApproval = row[5]?.toString().trim() || '';
    const ceo = row[6]?.toString().trim() || '';
    const remarks = row[7]?.toString().trim() || '';

    // Detect category headers (rows with no number but have text in column 2)
    if (!no && description && description.length > 0) {
      if (description.includes(')') && !description.includes('(')) {
        // This is a main category
        currentCategory = description;
        currentSubCategory = '';
      } else if (description.includes(')') && description.includes('(')) {
        // This is a subcategory
        currentSubCategory = description;
      }
      continue;
    }

    // Handle continuation rows: if no description but has limits/approvals, use last description
    let effectiveDescription = description;
    if (!description || description.length === 0) {
      // Check if this is a continuation row (has limits or approvals but no description)
      if (limits || shareholderApproval || boardApproval || ceo) {
        effectiveDescription = lastDescription;
      } else {
        // Skip completely empty rows
        continue;
      }
    } else {
      // Update last description when we have a new one
      lastDescription = description;
    }

    // Skip if we still don't have a description (shouldn't happen after above logic)
    if (!effectiveDescription || effectiveDescription.length === 0) continue;

    // Build context with category information
    let contextText = '';
    if (currentCategory) {
      contextText += `Category: ${currentCategory}\n`;
    }
    if (currentSubCategory) {
      contextText += `Subcategory: ${currentSubCategory}\n`;
    }

    // Build the full text with all relevant information
    let fullText = contextText + `Description: ${effectiveDescription}`;
    
    if (limits) {
      fullText += `\nLimits: ${limits}`;
    }
    if (shareholderApproval) {
      fullText += `\nShareholder Approval Required: ${shareholderApproval}`;
    }
    if (boardApproval) {
      fullText += `\nBoard Approval Required: ${boardApproval}`;
    }
    if (ceo) {
      fullText += `\nCEO Approval Required: ${ceo}`;
    }
    if (remarks) {
      fullText += `\nRemarks: ${remarks}`;
    }

    // Split long descriptions into chunks if needed
    const chunkSize = 1000;
    const chunkOverlap = 100;

    if (fullText.length > chunkSize) {
      // Split into multiple chunks
      let start = 0;
      while (start < fullText.length) {
        const end = Math.min(start + chunkSize, fullText.length);
        const chunkText = fullText.substring(start, end);
        
        chunks.push({
          text: chunkText,
          metadata: {
            rowNumber: i + 1, // Excel row number (1-indexed)
            category: currentCategory || undefined,
            no: no || undefined,
            limits: limits || undefined,
            shareholderApproval: shareholderApproval || undefined,
            boardApproval: boardApproval || undefined,
            ceo: ceo || undefined,
            remarks: remarks || undefined,
          },
        });

        start = end - chunkOverlap;
        if (start >= fullText.length) break;
      }
    } else {
      // Single chunk
      chunks.push({
        text: fullText,
        metadata: {
          rowNumber: i + 1,
          category: currentCategory || undefined,
          no: no || undefined,
          limits: limits || undefined,
          shareholderApproval: shareholderApproval || undefined,
          boardApproval: boardApproval || undefined,
          ceo: ceo || undefined,
          remarks: remarks || undefined,
        },
      });
    }
  }

  return chunks;
}

export function saveProcessedData(chunks: DOAChunk[], outputPath: string) {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(chunks, null, 2));
  console.log(`Saved ${chunks.length} chunks to ${outputPath}`);
}
