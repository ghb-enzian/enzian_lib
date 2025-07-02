/**
 * Core types and interfaces for the pipeline framework
 */

/**
 * Input declaration for a node, specifying how to reference another node's output
 */
export interface NodeInputDeclaration {
  /** Name of the input parameter */
  name: string;
  /** Reference to another node's output in format "nodename:typename:outputname" */
  source: string;
  /** Whether this input is required (default: true) */
  required?: boolean;
}

/**
 * Core interface that all pipeline nodes must implement
 */
export interface Node<TInputs = any, TOutputs = any> {
  /** Unique name identifier for this node */
  readonly name: string;
  /** Array of input declarations defining dependencies */
  readonly inputs: NodeInputDeclaration[];
  /** Main processing function that transforms inputs to outputs */
  process(inputs: TInputs): Promise<TOutputs>;
}

/**
 * Parsed result of a node reference string
 */
export interface ParsedNodeReference {
  /** Name of the referenced node */
  nodeName: string;
  /** Type name (for documentation/validation) */
  typeName: string;
  /** Name of the specific output from the node */
  outputName: string;
}

/**
 * Pipeline definition containing all nodes
 */
export interface Pipeline {
  /** Map of node name to node instance */
  nodes: Record<string, Node>;
}

/**
 * Execution context for a single node
 */
export interface NodeExecutionContext {
  /** Name of the node being executed */
  nodeName: string;
  /** Resolved input values for the node */
  inputs: any;
  /** Start time of execution */
  startTime: number;
}

/**
 * Result of executing a single node
 */
export interface NodeExecutionResult {
  /** Name of the node that was executed */
  nodeName: string;
  /** Whether execution was successful */
  success: boolean;
  /** Output values from the node (if successful) */
  outputs?: any;
  /** Error message (if failed) */
  error?: string;
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Overall pipeline execution result
 */
export interface PipelineExecutionResult {
  /** Whether the entire pipeline executed successfully */
  success: boolean;
  /** Results from each node execution */
  nodeResults: NodeExecutionResult[];
  /** Final outputs from all nodes */
  outputs: Record<string, any>;
  /** Total execution time in milliseconds */
  totalTime: number;
  /** Error message if pipeline failed */
  error?: string;
}

/**
 * Configuration options for pipeline execution
 */
export interface PipelineExecutionOptions {
  /** Maximum number of nodes to execute in parallel (default: 1) */
  maxConcurrency?: number;
  /** Timeout for individual node execution in milliseconds */
  nodeTimeout?: number;
  /** Whether to continue execution if a non-critical node fails */
  continueOnError?: boolean;
  /** Custom logger function */
  logger?: (message: string, level: 'info' | 'warn' | 'error') => void;
}