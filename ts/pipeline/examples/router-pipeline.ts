/**
 * Router Pipeline Example
 * 
 * Demonstrates dynamic routing based on data content:
 * DataSource → Classifier → Router → [TextProcessor | ImageProcessor | ErrorHandler]
 */

import { 
  Pipeline, 
  PipelineRunner, 
  createSourceNode, 
  createNode, 
  createRouterNode,
  createSinkNode 
} from '../src/index';

// Define our data types
interface ContentItem {
  id: number;
  type: 'text' | 'image' | 'unknown';
  content: string;
  confidence: number;
}

interface ClassificationResult {
  item: ContentItem;
  shouldProcess: boolean;
}

async function runRouterPipeline() {
  console.log('🔀 Running Router Pipeline Example\n');

  // Step 1: Data Source - generates content to classify
  const dataSource = createSourceNode<{ items: ContentItem[] }>('dataSource', async () => {
    console.log('📁 Loading content items...');
    
    return {
      items: [
        { id: 1, type: 'text', content: 'Hello world document', confidence: 0.9 },
        { id: 2, type: 'image', content: 'image_data_base64', confidence: 0.8 },
        { id: 3, type: 'text', content: 'Another text document', confidence: 0.95 },
        { id: 4, type: 'unknown', content: 'mysterious content', confidence: 0.3 }
      ]
    };
  });

  // Step 2: Classifier - analyzes content
  const classifier = createNode<
    { items: ContentItem[] },
    { results: ClassificationResult[] }
  >(
    'classifier',
    [{ name: 'items', source: 'dataSource:array:items' }],
    async (inputs) => {
      console.log(`🔍 Classifying ${inputs.items.length} items...`);
      
      const results = inputs.items.map(item => ({
        item,
        shouldProcess: item.confidence > 0.5
      }));

      return { results };
    }
  );

  // Step 3: Router - routes based on classification
  const contentRouter = createRouterNode<{ results: ClassificationResult[] }>(
    'contentRouter',
    [{ name: 'results', source: 'classifier:array:results' }],
    (inputs) => {
      console.log('🔀 Routing based on classification...');
      
      const routes: string[] = [];
      
      for (const result of inputs.results) {
        if (!result.shouldProcess) {
          routes.push('errorHandler');
        } else if (result.item.type === 'text') {
          routes.push('textProcessor');
        } else if (result.item.type === 'image') {
          routes.push('imageProcessor');
        } else {
          routes.push('unknownHandler');
        }
      }
      
      // Return unique routes
      return [...new Set(routes)];
    }
  );

  // Step 4: Text Processor
  const textProcessor = createNode<
    { results: ClassificationResult[] },
    { processedTexts: string[] }
  >(
    'textProcessor',
    [{ name: 'results', source: 'classifier:array:results' }],
    async (inputs) => {
      console.log('📝 Processing text items...');
      
      const textItems = inputs.results
        .filter(r => r.shouldProcess && r.item.type === 'text')
        .map(r => r.item.content.toUpperCase());
      
      return { processedTexts: textItems };
    }
  );

  // Step 5: Image Processor
  const imageProcessor = createNode<
    { results: ClassificationResult[] },
    { processedImages: string[] }
  >(
    'imageProcessor',
    [{ name: 'results', source: 'classifier:array:results' }],
    async (inputs) => {
      console.log('🖼️  Processing image items...');
      
      const imageItems = inputs.results
        .filter(r => r.shouldProcess && r.item.type === 'image')
        .map(r => `processed_${r.item.content}`);
      
      return { processedImages: imageItems };
    }
  );

  // Step 6: Error Handler
  const errorHandler = createSinkNode<{ results: ClassificationResult[] }>(
    'errorHandler',
    [{ name: 'results', source: 'classifier:array:results' }],
    async (inputs) => {
      console.log('❌ Handling problematic items...');
      
      const problematicItems = inputs.results
        .filter(r => !r.shouldProcess)
        .map(r => r.item);
      
      console.log(`Found ${problematicItems.length} problematic items:`, problematicItems);
    }
  );

  // Step 7: Unknown Handler
  const unknownHandler = createSinkNode<{ results: ClassificationResult[] }>(
    'unknownHandler',
    [{ name: 'results', source: 'classifier:array:results' }],
    async (inputs) => {
      console.log('❓ Handling unknown type items...');
      
      const unknownItems = inputs.results
        .filter(r => r.shouldProcess && r.item.type === 'unknown')
        .map(r => r.item);
      
      console.log(`Found ${unknownItems.length} unknown items:`, unknownItems);
    }
  );

  // Create the pipeline with all possible routes
  const pipeline: Pipeline = {
    nodes: {
      dataSource,
      classifier,
      contentRouter,
      textProcessor,
      imageProcessor,
      errorHandler,
      unknownHandler
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
    console.log('\n✅ Pipeline executed successfully!');
    console.log(`⏱️  Total execution time: ${result.totalTime}ms`);
    
    console.log('\n📊 Execution Summary:');
    result.nodeResults.forEach(nodeResult => {
      const status = nodeResult.success ? '✅' : '❌';
      console.log(`  ${status} ${nodeResult.nodeName}: ${nodeResult.executionTime}ms`);
      
      if (nodeResult.nodeName === 'contentRouter' && nodeResult.outputs) {
        console.log(`    └─ Routed to: ${nodeResult.outputs.routedTo.join(', ')}`);
      }
    });
  } else {
    console.error('❌ Pipeline failed:', result.error);
  }

  return result;
}

// Run the example if this file is executed directly
if (require.main === module) {
  runRouterPipeline()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Example failed:', error);
      process.exit(1);
    });
}

export { runRouterPipeline };