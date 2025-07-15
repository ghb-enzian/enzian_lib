# @enzian/pipeline

TypeScript pipeline framework with node references and data-driven routing.

## Core Concept

Connect nodes using pipe references: `"nodeName:type:fieldName"`

```typescript
import { Pipeline, PipelineRunner, createSourceNode, createNode, createRouterNode } from '@enzian/pipeline';

// Static pipeline
const source = createSourceNode('getData', async () => ({ numbers: [1, 2, 3] }));
const processor = createNode('double', [
  { name: 'input', source: 'getData:array:numbers' }
], async (inputs) => ({ doubled: inputs.input.map(n => n * 2) }));

// Dynamic routing
const router = createRouterNode('route', [
  { name: 'data', source: 'double:array:doubled' }
], (inputs) => {
  return inputs.data.length > 5 ? 'bigProcessor' : 'smallProcessor';
});

const pipeline: Pipeline = { nodes: { getData: source, double: processor, route: router } };
await new PipelineRunner().execute(pipeline);
```

## Node Types

**Source** (no inputs):
```typescript
createSourceNode('name', async () => ({ data: 'value' }))
```

**Processor** (transforms data):
```typescript
createNode('name', [
  { name: 'input', source: 'sourceNode:type:field' }
], async (inputs) => ({ output: result }))
```

**Router** (conditional routing):
```typescript
createRouterNode('name', [
  { name: 'data', source: 'sourceNode:type:field' }
], (inputs) => inputs.data.type === 'text' ? 'textProcessor' : 'imageProcessor')
```

**Sink** (no outputs):
```typescript
createSinkNode('name', [
  { name: 'data', source: 'sourceNode:type:field' }
], async (inputs) => { console.log(inputs.data); })
```

## Pipe Reference Format

```
"nodeName:type:fieldName"
 ^^^^^^^^ ^^^^ ^^^^^^^^^
 │        │    └─ Output field to extract
 │        └─ Type hint (documentation)
 └─ Source node name
```

## Dynamic Routing Example

```typescript
// Content analysis pipeline with conditional routing
const dataLoader = createSourceNode('loader', async () => ({
  items: [
    { content: 'Hello world', type: 'text', confidence: 0.9 },
    { content: 'image_data', type: 'image', confidence: 0.8 },
    { content: 'unknown_data', type: 'unknown', confidence: 0.3 }
  ]
}));

const classifier = createNode('classify', [
  { name: 'items', source: 'loader:array:items' }
], async (inputs) => ({
  results: inputs.items.map(item => ({
    ...item,
    shouldProcess: item.confidence > 0.5
  }))
}));

// Router decides next steps based on data
const contentRouter = createRouterNode('router', [
  { name: 'results', source: 'classify:array:results' }
], (inputs) => {
  const routes = [];
  for (const result of inputs.results) {
    if (!result.shouldProcess) {
      routes.push('errorHandler');
    } else if (result.type === 'text') {
      routes.push('textProcessor');
    } else if (result.type === 'image') {
      routes.push('imageProcessor');
    }
  }
  return [...new Set(routes)]; // unique routes
});

// Multiple processing paths
const textProcessor = createNode('textProcessor', [
  { name: 'results', source: 'classify:array:results' }
], async (inputs) => ({
  processedTexts: inputs.results
    .filter(r => r.shouldProcess && r.type === 'text')
    .map(r => r.content.toUpperCase())
}));

const imageProcessor = createNode('imageProcessor', [
  { name: 'results', source: 'classify:array:results' }
], async (inputs) => ({
  processedImages: inputs.results
    .filter(r => r.shouldProcess && r.type === 'image')
    .map(r => `processed_${r.content}`)
}));

const errorHandler = createSinkNode('errorHandler', [
  { name: 'results', source: 'classify:array:results' }
], async (inputs) => {
  const errors = inputs.results.filter(r => !r.shouldProcess);
  console.log('Low confidence items:', errors);
});

// Pipeline with dynamic execution
const pipeline: Pipeline = {
  nodes: {
    loader: dataLoader,
    classify: classifier,
    router: contentRouter,
    textProcessor,
    imageProcessor,
    errorHandler
  }
};

// Router will execute only the needed processors based on data
await new PipelineRunner().execute(pipeline);
```

## Installation

```bash
npm install @enzian/pipeline
```
