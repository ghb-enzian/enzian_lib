# @enzian/pipeline

A simple, flexible pipeline framework for TypeScript with node-based processing and runtime validation.

## Overview

This library provides a powerful yet simple way to create processing pipelines where:
- **Nodes** represent processing steps that transform inputs to outputs
- **Dependencies** are declared using a clear `nodename:typename:outputname` syntax
- **Runtime validation** ensures pipeline integrity before execution
- **Execution engine** handles dependency resolution and manages execution order

Perfect for data processing, file analysis, batch operations, and complex workflows.

## Installation

```bash
# If published to npm
npm install @enzian/pipeline

# Or import directly from this repository
import { ... } from '/path/to/enzian_lib_ts/pipeline'
```

## Quick Start

```typescript
import { 
  Pipeline, 
  PipelineRunner, 
  createSourceNode, 
  createNode 
} from '@enzian/pipeline';

// Create nodes
const dataSource = createSourceNode('source', async () => ({
  data: [1, 2, 3, 4, 5]
}));

const processor = createNode(
  'processor',
  [{ name: 'numbers', source: 'source:number[]:data' }],
  async (inputs) => ({
    doubled: inputs.numbers.map(n => n * 2)
  })
);

// Create and run pipeline
const pipeline = { nodes: { source: dataSource, processor } };
const result = await new PipelineRunner().execute(pipeline);

console.log(result.outputs.processor.doubled); // [2, 4, 6, 8, 10]
```

## Core Concepts

### Nodes

Nodes are the building blocks of your pipeline. Each node:
- Has a unique name
- Declares its input dependencies 
- Implements a `process` function that transforms inputs to outputs

```typescript
interface Node<TInputs, TOutputs> {
  readonly name: string;
  readonly inputs: NodeInputDeclaration[];
  process(inputs: TInputs): Promise<TOutputs>;
}
```

### Node Reference Syntax

Dependencies between nodes are declared using the format: `nodename:typename:outputname`

- `nodename`: The name of the node producing the output
- `typename`: TypeScript type name (for documentation)  
- `outputname`: The specific output property to use

```typescript
// Node A produces: { text: string, metadata: object }
// Node B can reference specific outputs:
{
  name: 'content', 
  source: 'nodeA:string:text'        // Gets the 'text' output
},
{
  name: 'info', 
  source: 'nodeA:object:metadata'    // Gets the 'metadata' output
}
```

### Pipeline Definition

A pipeline is simply a collection of named nodes:

```typescript
const pipeline: Pipeline = {
  nodes: {
    source: sourceNode,
    processor: processorNode,
    sink: sinkNode
  }
};
```

## Creating Nodes

### Functional Nodes

Use helper functions for simple nodes:

```typescript
import { createNode, createSourceNode, createSinkNode } from '@enzian/pipeline';

// Source node (no inputs)
const dataLoader = createSourceNode('loader', async () => ({
  documents: await loadDocuments()
}));

// Processing node
const analyzer = createNode(
  'analyzer',
  [{ name: 'docs', source: 'loader:Document[]:documents' }],
  async (inputs) => ({
    analysis: analyzeDocuments(inputs.docs)
  })
);

// Sink node (no outputs) 
const writer = createSinkNode(
  'writer',
  [{ name: 'analysis', source: 'analyzer:Analysis:analysis' }],
  async (inputs) => {
    await writeToFile(inputs.analysis);
  }
);
```

### Class-based Nodes with Utilities

Extend `NodeBase` for advanced features:

```typescript
import { NodeBase } from '@enzian/pipeline';

class LLMProcessorNode extends NodeBase {
  name = 'llmProcessor';
  inputs = [{ name: 'text', source: 'extractor:string:content' }];

  async process(inputs: { text: string }) {
    this.log('Starting LLM processing');
    
    // Validate inputs
    this.validateInputs(inputs, ['text']);
    
    // Retry with exponential backoff
    const result = await this.retry(async () => {
      return await this.callLLMAPI(inputs.text);
    }, 3);
    
    this.log('LLM processing completed');
    return { analysis: result };
  }
  
  private async callLLMAPI(text: string) {
    // Your LLM API call here
  }
}
```

### Available NodeBase Utilities

- `log(message, level)` - Structured logging
- `validateInputs(inputs, required)` - Input validation
- `retry(operation, attempts)` - Retry with exponential backoff
- `measureTime(operation)` - Execution time measurement
- `withTimeout(operation, ms)` - Timeout wrapper
- `sleep(ms)` - Async sleep utility

## Pipeline Execution

### Basic Execution

```typescript
import { PipelineRunner } from '@enzian/pipeline';

const runner = new PipelineRunner();
const result = await runner.execute(pipeline);

if (result.success) {
  console.log('Pipeline completed!');
  console.log('Outputs:', result.outputs);
} else {
  console.error('Pipeline failed:', result.error);
}
```

### Execution Options

```typescript
const runner = new PipelineRunner({
  maxConcurrency: 3,        // Max parallel nodes (future feature)
  nodeTimeout: 30000,       // Timeout per node (ms)
  continueOnError: false,   // Stop on first error vs continue
  logger: customLogger      // Custom logging function
});
```

### Execution Results

```typescript
interface PipelineExecutionResult {
  success: boolean;
  nodeResults: NodeExecutionResult[];  // Per-node results
  outputs: Record<string, any>;        // Final outputs from all nodes
  totalTime: number;                   // Total execution time (ms)
  error?: string;                      // Error message if failed
}
```

## Validation

The pipeline is automatically validated before execution:

```typescript
import { PipelineValidator } from '@enzian/pipeline';

// Manual validation
try {
  PipelineValidator.validate(pipeline);
  console.log('Pipeline is valid!');
} catch (error) {
  console.error('Validation failed:', error.message);
}

// Get execution order
const order = PipelineValidator.getExecutionOrder(pipeline);
console.log('Execution order:', order);

// Find source/sink nodes
const sources = PipelineValidator.findSourceNodes(pipeline);
const sinks = PipelineValidator.findSinkNodes(pipeline);
```

### Validation Checks

- **Reference format**: Ensures `nodename:typename:outputname` syntax
- **Node existence**: Referenced nodes must exist in pipeline
- **Circular dependencies**: Detects and prevents cycles
- **Source nodes**: At least one node with no inputs required

## Examples

### Linear Pipeline

```typescript
// FileReader → TextProcessor → ReportGenerator
const pipeline = {
  nodes: {
    reader: createSourceNode('reader', async () => ({ 
      content: 'Hello world' 
    })),
    
    processor: createNode('processor',
      [{ name: 'text', source: 'reader:string:content' }],
      async (inputs) => ({ 
        processed: inputs.text.toUpperCase() 
      })
    ),
    
    generator: createNode('generator',
      [{ name: 'text', source: 'processor:string:processed' }],
      async (inputs) => ({ 
        report: `Report: ${inputs.text}` 
      })
    )
  }
};
```

### Branching Pipeline

```typescript
//           → ProcessorA →
// DataSource              → Merger  
//           → ProcessorB →

const pipeline = {
  nodes: {
    source: createSourceNode('source', async () => ({ 
      data: [1, 2, 3, 4, 5] 
    })),
    
    processorA: createNode('processorA',
      [{ name: 'nums', source: 'source:number[]:data' }],
      async (inputs) => ({ 
        evens: inputs.nums.filter(n => n % 2 === 0) 
      })
    ),
    
    processorB: createNode('processorB', 
      [{ name: 'nums', source: 'source:number[]:data' }],
      async (inputs) => ({ 
        odds: inputs.nums.filter(n => n % 2 === 1) 
      })
    ),
    
    merger: createNode('merger',
      [
        { name: 'evens', source: 'processorA:number[]:evens' },
        { name: 'odds', source: 'processorB:number[]:odds' }
      ],
      async (inputs) => ({
        summary: {
          evenCount: inputs.evens.length,
          oddCount: inputs.odds.length
        }
      })
    )
  }
};
```

## Real-World Example: Document Analysis Pipeline

See `examples/file-processing.ts` for a complete example showing:
- File loading and content extraction
- LLM-based document analysis  
- Executive summary generation
- Error handling and retry logic

```typescript
// FileLoader → ContentExtractor → LLMAnalyzer → ExecutiveSummaryGenerator
const pipeline = {
  nodes: {
    fileLoader: new FileLoaderNode(),
    contentExtractor: new ContentExtractorNode(), 
    llmAnalyzer: new LLMAnalyzerNode(),
    executiveSummaryGenerator: new ExecutiveSummaryGeneratorNode()
  }
};
```

## API Reference

### Core Types

- `Node<TInputs, TOutputs>` - Main node interface
- `Pipeline` - Collection of named nodes
- `NodeInputDeclaration` - Input dependency declaration
- `PipelineExecutionResult` - Execution results
- `PipelineExecutionOptions` - Execution configuration

### Utilities

- `createNode()` - Create functional node
- `createSourceNode()` - Create source node (no inputs)
- `createSinkNode()` - Create sink node (no outputs)
- `NodeBase` - Base class with utilities
- `PipelineValidator` - Validation utilities
- `PipelineRunner` - Execution engine
- `executePipeline()` - Convenience execution function

### Validation

- `parseNodeReference()` - Parse reference string
- `isValidNodeReference()` - Validate reference format
- `PipelineValidator.validate()` - Full pipeline validation
- `PipelineValidator.getExecutionOrder()` - Get execution order
- `PipelineValidator.detectCycles()` - Check for circular dependencies

## Error Handling

The library provides comprehensive error handling:

```typescript
// Node-level errors
class MyNode extends NodeBase {
  async process(inputs: any) {
    try {
      // Your processing logic
    } catch (error) {
      this.handleError(error, 'processing data');
    }
  }
}

// Pipeline-level error handling
const result = await runner.execute(pipeline);
if (!result.success) {
  console.error('Pipeline failed:', result.error);
  
  // Check individual node results
  result.nodeResults.forEach(nodeResult => {
    if (!nodeResult.success) {
      console.error(`Node ${nodeResult.nodeName} failed:`, nodeResult.error);
    }
  });
}
```

## Testing

Run the test suite:

```bash
cd /path/to/enzian_lib_ts/pipeline
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

## Examples

Run the included examples:

```bash
# Basic linear pipeline
npx ts-node examples/basic-pipeline.ts

# Branching pipeline with merging
npx ts-node examples/branching-pipeline.ts

# File processing pipeline (GenAI style)
npx ts-node examples/file-processing.ts
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Lint
npm run lint
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

---

This pipeline framework is designed to be simple yet powerful. It handles the complexity of dependency resolution and execution order while keeping the node creation process straightforward. Perfect for building robust data processing workflows, document analysis systems, and batch processing pipelines.