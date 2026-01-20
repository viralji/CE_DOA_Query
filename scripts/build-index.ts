import { config } from 'dotenv';
import { processExcelFile } from '../lib/process-excel';
import { buildVectorStore, getVectorStore } from '../lib/vectorstore';
import * as path from 'path';

// Load environment variables
config();

const EXCEL_FILE = path.join(process.cwd(), '9 DOA - 2024-10-13 v2 BK.xlsx');

async function main() {
  try {
    console.log('Building vector index...');
    console.log(`Processing Excel file: ${EXCEL_FILE}`);
    
    // Process Excel file
    const chunks = processExcelFile(EXCEL_FILE);
    console.log(`Processed ${chunks.length} chunks`);
    
    // Build vector store
    const vectorStore = await buildVectorStore(chunks);
    console.log('Vector store built successfully');
    
    // Test retrieval
    const testQuery = 'What is the approval process for board meetings?';
    console.log(`\nTesting retrieval with query: "${testQuery}"`);
    const results = await vectorStore.similaritySearch(testQuery, 3);
    console.log(`Found ${results.length} relevant documents`);
    
    results.forEach((doc, i) => {
      console.log(`\nResult ${i + 1}:`);
      console.log(`Row: ${doc.metadata.rowNumber}`);
      console.log(`Category: ${doc.metadata.category || 'N/A'}`);
      console.log(`Preview: ${doc.pageContent.substring(0, 200)}...`);
    });
    
    console.log('\nIndex build complete!');
  } catch (error) {
    console.error('Error building index:', error);
    process.exit(1);
  }
}

main();
