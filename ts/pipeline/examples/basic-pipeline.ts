/**
 * Basic Pipeline Example
 * 
 * This example demonstrates a simple linear pipeline:
 * DataSource → TextProcessor → OutputWriter
 */

import { 
  Pipeline, 
  PipelineRunner, 
  createSourceNode, 
  createNode, 
  createSinkNode 
} from '../src/index';

// Define our data types
interface Document {
  id: number;
  title: string;
  content: string;
}

interface ProcessedDocument {
  id: number;
  title: string;
  content: string;
  wordCount: number;
  summary: string;
}

async function runBasicPipeline() {
  console.log('🚀 Running Basic Pipeline Example\n');

  // Step 1: Data Source Node - generates initial data
  const dataSource = createSourceNode<{ documents: Document[] }>('dataSource', async () => {
    console.log('📁 Loading documents...');
    
    return {
      documents: [
        {
          id: 1,
          title: 'Introduction to TypeScript',
          content: 'TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.'
        },
        {
          id: 2,
          title: 'Pipeline Patterns',
          content: 'Pipeline patterns allow you to break down complex processing into simple, composable steps that can be easily tested and maintained.'
        }
      ]
    };
  });

  // Step 2: Text Processing Node - processes the documents
  const textProcessor = createNode<
    { docs: Document[] },
    { processedDocs: ProcessedDocument[] }
  >(
    'textProcessor',
    [{ name: 'docs', source: 'dataSource:DocumentArray:documents' }],
    async (inputs) => {
      console.log(`🔄 Processing ${inputs.docs.length} documents...`);
      
      const processedDocs = inputs.docs.map(doc => {
        const wordCount = doc.content.split(' ').length;
        const summary = doc.content.substring(0, 50) + '...';
        
        return {
          ...doc,
          wordCount,
          summary
        };
      });

      return { processedDocs };
    }
  );

  // Step 3: Output Writer Node - outputs the results
  const outputWriter = createSinkNode<{ processedDocs: ProcessedDocument[] }>(
    'outputWriter',
    [{ name: 'processedDocs', source: 'textProcessor:ProcessedDocumentArray:processedDocs' }],
    async (inputs) => {
      console.log('📝 Writing output...\n');
      
      console.log('=== PROCESSING RESULTS ===');
      inputs.processedDocs.forEach(doc => {
        console.log(`📄 Document ${doc.id}: "${doc.title}"`);
        console.log(`   Word count: ${doc.wordCount}`);
        console.log(`   Summary: ${doc.summary}`);
        console.log('');
      });
    }
  );

  // Create the pipeline
  const pipeline: Pipeline = {
    nodes: {
      dataSource,
      textProcessor,
      outputWriter
    }
  };

  // Execute the pipeline
  const runner = new PipelineRunner({
    logger: (message, level) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    }
  });

  const result = await runner.execute(pipeline);

  if (result.success) {
    console.log('✅ Pipeline executed successfully!');
    console.log(`⏱️  Total execution time: ${result.totalTime}ms`);
  } else {
    console.error('❌ Pipeline failed:', result.error);
  }

  return result;
}

// Run the example if this file is executed directly
if (require.main === module) {
  runBasicPipeline()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Example failed:', error);
      process.exit(1);
    });
}

export { runBasicPipeline };