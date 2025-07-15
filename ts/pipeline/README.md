# @enzian/pipeline

A TypeScript pipeline framework based on **node references**. Connect nodes by specifying exactly which data flows where.

## The Piping Formalism

Everything revolves around the **node reference syntax**:

```
"sourceNode:dataType:fieldName"
```

This creates a **pipe** from one node's output to another node's input.

## How it works

```typescript
import { Pipeline, PipelineRunner, createSourceNode, createNode, createSinkNode } from '@enzian/pipeline';

// 1. Source node produces data
const dataLoader = createSourceNode('loader', async () => {
  return {
    documents: ['doc1.txt', 'doc2.txt'],
    metadata: { count: 2, source: 'filesystem' }
  };
});

// 2. Processor node consumes specific fields via pipes
const textProcessor = createNode(
  'processor',
  [
    { name: 'files', source: 'loader:string[]:documents' },  // pipe documents → files
    { name: 'info', source: 'loader:object:metadata' }      // pipe metadata → info
  ],
  async (inputs) => {
    return {
      processedCount: inputs.files.length,
      summary: `Processed ${inputs.files.length} files from ${inputs.info.source}`
    };
  }
);

// 3. Output node consumes processed data
const reporter = createSinkNode(
  'reporter',
  [
    { name: 'count', source: 'processor:number:processedCount' },
    { name: 'text', source: 'processor:string:summary' }
  ],
  async (inputs) => {
    console.log(`Count: ${inputs.count}`);
    console.log(`Summary: ${inputs.text}`);
  }
);

// 4. Pipeline defines the node graph
const pipeline: Pipeline = {
  nodes: { loader: dataLoader, processor: textProcessor, reporter }
};

// 5. Execute with dependency resolution
await new PipelineRunner().execute(pipeline);
```

## Piping Formalism Details

### Reference Syntax: `"source:type:field"`

```typescript
"loader:string[]:documents"
 ^^^^^^ ^^^^^^^^^ ^^^^^^^^^
 │      │         └─ Field name in the source node's output
 │      └─ Type annotation (documentation only)
 └─ Source node name
```

### How Pipes Work

1. **Source node** `loader` outputs: `{ documents: [...], metadata: {...} }`
2. **Pipe** `"loader:string[]:documents"` extracts the `documents` field
3. **Target node** `processor` receives it as `inputs.files`

### Multiple Pipes to Same Node

```typescript
const analyzer = createNode('analyzer', [
  { name: 'content', source: 'reader:string:text' },      // pipe 1
  { name: 'format', source: 'reader:string:fileType' },   // pipe 2
  { name: 'size', source: 'scanner:number:byteCount' }    // pipe 3
], async (inputs) => {
  // inputs.content, inputs.format, inputs.size are all available
});
```

### Branching: One Source, Multiple Targets

```typescript
// fileLoader outputs: { content: "...", size: 1024 }

const textAnalyzer = createNode('textAnalyzer', [
  { name: 'data', source: 'fileLoader:string:content' }  // uses content
], ...);

const sizeChecker = createNode('sizeChecker', [
  { name: 'bytes', source: 'fileLoader:number:size' }    // uses size
], ...);
```

## Node Types and Piping

### Source Nodes (Producers)
```typescript
createSourceNode('nodeName', async () => ({
  field1: value1,    // Available as "nodeName:type:field1"
  field2: value2,    // Available as "nodeName:type:field2"
}))
```

### Processing Nodes (Transformers)
```typescript
createNode('nodeName', [
  { name: 'input1', source: 'sourceNode:type:field' },  // incoming pipe
  { name: 'input2', source: 'otherNode:type:field' }    // another pipe
], async (inputs) => ({
  output1: transform(inputs.input1),  // Available as "nodeName:type:output1"
  output2: process(inputs.input2)     // Available as "nodeName:type:output2"
}))
```

### Sink Nodes (Consumers)
```typescript
createSinkNode('nodeName', [
  { name: 'finalData', source: 'lastNode:type:result' }  // incoming pipe
], async (inputs) => {
  // Process inputs.finalData - no outputs
})
```

## Type Annotations in Pipes

The middle part of the reference is **documentation only**:

```typescript
"loader:string[]:documents"    // documents is a string array
"scanner:number:fileSize"      // fileSize is a number
"parser:Document:result"       // result is a custom Document type
"api:any:response"             // response can be anything
```

Types help developers understand data flow but don't affect runtime behavior.

## Complex Pipeline Example

```typescript
//                    ┌─→ textAnalyzer ─→┐
// fileLoader ─→ splitter                merger ─→ reporter
//                    └─→ metaExtractor ─→┘

const fileLoader = createSourceNode('fileLoader', async () => ({
  content: "Hello World! This is a test document.",
  filename: "test.txt"
}));

const splitter = createNode('splitter', [
  { name: 'text', source: 'fileLoader:string:content' },
  { name: 'name', source: 'fileLoader:string:filename' }
], async (inputs) => ({
  words: inputs.text.split(' '),
  metadata: { originalFile: inputs.name, splitAt: new Date() }
}));

const textAnalyzer = createNode('textAnalyzer', [
  { name: 'wordList', source: 'splitter:string[]:words' }
], async (inputs) => ({
  wordCount: inputs.wordList.length,
  longestWord: inputs.wordList.reduce((a, b) => a.length > b.length ? a : b)
}));

const metaExtractor = createNode('metaExtractor', [
  { name: 'meta', source: 'splitter:object:metadata' }
], async (inputs) => ({
  processedAt: inputs.meta.splitAt,
  sourceFile: inputs.meta.originalFile
}));

const merger = createNode('merger', [
  { name: 'stats', source: 'textAnalyzer:object:*' },      // gets all textAnalyzer outputs
  { name: 'info', source: 'metaExtractor:object:*' }       // gets all metaExtractor outputs
], async (inputs) => ({
  report: {
    analysis: inputs.stats,
    metadata: inputs.info,
    generatedAt: new Date()
  }
}));

const reporter = createSinkNode('reporter', [
  { name: 'finalReport', source: 'merger:object:report' }
], async (inputs) => {
  console.log('Final Report:', JSON.stringify(inputs.finalReport, null, 2));
});
```
