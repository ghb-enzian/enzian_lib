/**
 * @enzian/pipeline - A simple, flexible pipeline framework for TypeScript
 * 
 * This library provides a node-based pipeline system where:
 * - Nodes process data and produce outputs
 * - Nodes can reference other nodes' outputs using "nodename:typename:outputname" syntax
 * - Runtime validation ensures pipeline integrity
 * - Execution engine handles dependency resolution and execution order
 */

// Core types and interfaces
export {
  Node,
  NodeInputDeclaration,
  ParsedNodeReference,
  Pipeline,
  NodeExecutionContext,
  NodeExecutionResult,
  PipelineExecutionResult,
  PipelineExecutionOptions
} from './types';

// Node utilities and base class
export {
  NodeBase,
  createNode,
  createSourceNode,
  createSinkNode
} from './node';

// Validation utilities
export {
  PipelineValidator,
  parseNodeReference,
  isValidNodeReference
} from './validator';

// Execution engine
export {
  PipelineRunner,
  executePipeline
} from './runner';

// Version
export const VERSION = '1.0.0';