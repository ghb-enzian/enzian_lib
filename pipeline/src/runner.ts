/**
 * Pipeline execution engine
 */

import { 
  Pipeline, 
  PipelineExecutionOptions, 
  PipelineExecutionResult, 
  NodeExecutionResult,
  NodeExecutionContext
} from './types';
import { PipelineValidator, parseNodeReference } from './validator';

/**
 * Default execution options
 */
const DEFAULT_OPTIONS: Required<PipelineExecutionOptions> = {
  maxConcurrency: 1,
  nodeTimeout: 30000, // 30 seconds
  continueOnError: false,
  logger: (message: string, level: 'info' | 'warn' | 'error') => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [PipelineRunner]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ERROR: ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} WARN: ${message}`);
        break;
      default:
        console.log(`${prefix} INFO: ${message}`);
    }
  }
};

/**
 * Pipeline execution engine
 */
export class PipelineRunner {
  private options: Required<PipelineExecutionOptions>;

  constructor(options: PipelineExecutionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a pipeline
   */
  async execute(pipeline: Pipeline): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate pipeline before execution
      PipelineValidator.validate(pipeline);
      
      // Get execution order
      const executionOrder = PipelineValidator.getExecutionOrder(pipeline);
      this.options.logger(`Execution order: ${executionOrder.join(' → ')}`, 'info');
      
      // Execute nodes in order
      const nodeResults: NodeExecutionResult[] = [];
      const nodeOutputs: Record<string, any> = {};
      
      for (const nodeName of executionOrder) {
        const result = await this.executeNode(nodeName, pipeline, nodeOutputs);
        nodeResults.push(result);
        
        if (!result.success) {
          if (!this.options.continueOnError) {
            return {
              success: false,
              nodeResults,
              outputs: nodeOutputs,
              totalTime: Date.now() - startTime,
              error: `Pipeline failed at node "${nodeName}": ${result.error}`
            };
          } else {
            this.options.logger(`Node "${nodeName}" failed but continuing: ${result.error}`, 'warn');
          }
        } else {
          // Store successful outputs
          nodeOutputs[nodeName] = result.outputs;
        }
      }
      
      return {
        success: true,
        nodeResults,
        outputs: nodeOutputs,
        totalTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        nodeResults: [],
        outputs: {},
        totalTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    nodeName: string, 
    pipeline: Pipeline, 
    availableOutputs: Record<string, any>
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const node = pipeline.nodes[nodeName];
    
    try {
      this.options.logger(`Executing node: ${nodeName}`, 'info');
      
      // Resolve inputs
      const inputs = this.resolveInputs(node.inputs, availableOutputs);
      
      // Create execution context
      const context: NodeExecutionContext = {
        nodeName,
        inputs,
        startTime
      };
      
      // Execute with timeout
      const outputs = await this.withTimeout(
        () => node.process(inputs),
        this.options.nodeTimeout
      );
      
      const executionTime = Date.now() - startTime;
      this.options.logger(`Node "${nodeName}" completed in ${executionTime}ms`, 'info');
      
      return {
        nodeName,
        success: true,
        outputs,
        executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.options.logger(`Node "${nodeName}" failed after ${executionTime}ms: ${errorMessage}`, 'error');
      
      return {
        nodeName,
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * Resolve inputs for a node from available outputs
   */
  private resolveInputs(
    inputDeclarations: any[], 
    availableOutputs: Record<string, any>
  ): any {
    const resolvedInputs: any = {};
    
    for (const input of inputDeclarations) {
      const { nodeName, outputName } = parseNodeReference(input.source);
      
      // Check if the referenced node has been executed
      if (!(nodeName in availableOutputs)) {
        if (input.required !== false) {
          throw new Error(`Required input "${input.name}" depends on node "${nodeName}" which hasn't been executed yet`);
        }
        continue;
      }
      
      const nodeOutputs = availableOutputs[nodeName];
      
      // Check if the specific output exists
      if (!(outputName in nodeOutputs)) {
        if (input.required !== false) {
          throw new Error(`Required input "${input.name}" references non-existent output "${outputName}" from node "${nodeName}"`);
        }
        continue;
      }
      
      resolvedInputs[input.name] = nodeOutputs[outputName];
    }
    
    return resolvedInputs;
  }

  /**
   * Execute operation with timeout
   */
  private withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}

/**
 * Convenience function to execute a pipeline with default options
 */
export async function executePipeline(
  pipeline: Pipeline, 
  options?: PipelineExecutionOptions
): Promise<PipelineExecutionResult> {
  const runner = new PipelineRunner(options);
  return runner.execute(pipeline);
}