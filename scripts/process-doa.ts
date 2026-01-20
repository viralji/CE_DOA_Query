import { config } from 'dotenv';
import { processExcelFile, saveProcessedData } from '../lib/process-excel';
import * as path from 'path';

// Load environment variables
config();

const EXCEL_FILE = path.join(process.cwd(), '9 DOA - 2024-10-13 v2 BK.xlsx');
const OUTPUT_FILE = path.join(process.cwd(), 'data/processed/doa-chunks.json');

async function main() {
  try {
    console.log('Processing Excel file...');
    console.log(`Input file: ${EXCEL_FILE}`);
    
    const chunks = processExcelFile(EXCEL_FILE);
    console.log(`Processed ${chunks.length} chunks`);
    
    saveProcessedData(chunks, OUTPUT_FILE);
    console.log('Processing complete!');
  } catch (error) {
    console.error('Error processing Excel file:', error);
    process.exit(1);
  }
}

main();
