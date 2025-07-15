/**
 * Pipeline execution engine
 */

import { 
  Pipeline, 
  PipelineExecutionOptions, 
  PipelineExecutionResult, 
  NodeExecutionResult,
  NodeExecutionContext,
  RouterNode
} from './types';
import { PipelineValidator, parseNodeReference } from './validator';

/**
 * Default execution options
 */
const DEFAULT_OPTIONS: Required<PipelineExecutionOptions> = {
  maxConcurrency: 1,
  nodeTimeout: 30000, // 30 seconds
  continueOnError: false,
  logger: () => {
    // No-op logger by default - users must provide their own logger implementation
    // This ensures the library works in all environments (browser, Node.js, etc.)
  }
};

/**
 * Check if a node is a router node
 */
function isRouterNode(node: any): node is RouterNode {
  return typeof node.route === 'function' && !node.process;
}

/**
 * Pipeline execution engine
 */
export class PipelineRunner {
  private options: Required<PipelineExecutionOptions>;

  constructor(options: PipelineExecutionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a pipeline with support for dynamic routing
   */
  async execute(pipeline: Pipeline): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate pipeline before execution
      PipelineValidator.validate(pipeline);
      
      // Find source nodes to start execution
      const sourceNodes = PipelineValidator.findSourceNodes(pipeline);
      this.options.logger(`Starting with source nodes: ${sourceNodes.join(', ')}`, 'info');
      
      // Execute with dynamic flow
      const nodeResults: NodeExecutionResult[] = [];
      const nodeOutputs: Record<string, any> = {};
      const executedNodes = new Set<string>();
      
      try {
        // Execute source nodes first
        for (const nodeName of sourceNodes) {
          await this.executeDynamicFlow(nodeName, pipeline, nodeOutputs, nodeResults, executedNodes);
        }
        
        // Continue executing remaining nodes that may not have been reached through dependencies
        let continueExecution = true;
        while (continueExecution) {
          const remainingNodes = Object.keys(pipeline.nodes).filter(name => !executedNodes.has(name));
          if (remainingNodes.length === 0) {
            break;
          }
          
          continueExecution = false;
          for (const nodeName of remainingNodes) {
            const node = pipeline.nodes[nodeName];
            const allDependenciesMet = node.inputs.every(input => {
              const { nodeName: depNodeName } = parseNodeReference(input.source);
              return executedNodes.has(depNodeName);
            });
            
            if (allDependenciesMet) {
              await this.executeDynamicFlow(nodeName, pipeline, nodeOutputs, nodeResults, executedNodes);
              continueExecution = true;
              break; // Restart the loop to check dependencies again
            }
          }
        }
      } catch (executionError) {
        const errorMessage = executionError instanceof Error ? executionError.message : String(executionError);
        return {
          success: false,
          nodeResults,
          outputs: nodeOutputs,
          totalTime: Date.now() - startTime,
          error: errorMessage
        };
      }
      
      return {
        success: true,
        nodeResults,
        outputs: nodeOutputs,
        totalTime: Date.now() - startTime
      };
      
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.options.logger(errorMessage, 'error');
        return {
            success: false,
            nodeResults: [],
            outputs: {},
            totalTime: Date.now() - startTime,
            error: errorMessage
        };
    }
  }

  /**
   * Execute nodes with dynamic flow based on routing decisions
   */
  private async executeDynamicFlow(
    nodeName: string,
    pipeline: Pipeline,
    nodeOutputs: Record<string, any>,
    nodeResults: NodeExecutionResult[],
    executedNodes: Set<string>
  ): Promise<void> {
    // Skip if already executed
    if (executedNodes.has(nodeName)) {
      return;
    }

    const node = pipeline.nodes[nodeName];
    if (!node) {
      throw new Error(`Node "${nodeName}" not found in pipeline`);
    }

    // Check dependencies are satisfied
    for (const input of node.inputs) {
      const { nodeName: depNodeName } = parseNodeReference(input.source);
      if (!executedNodes.has(depNodeName)) {
        // Execute dependency first
        await this.executeDynamicFlow(depNodeName, pipeline, nodeOutputs, nodeResults, executedNodes);
      }
    }

    // Execute the node
    if (isRouterNode(node)) {
      await this.executeRouter(node, pipeline, nodeOutputs, nodeResults, executedNodes);
    } else {
      const result = await this.executeNode(nodeName, pipeline, nodeOutputs);
      nodeResults.push(result);
      
      if (!result.success) {
        if (!this.options.continueOnError) {
          throw new Error(`Pipeline failed at node "${nodeName}": ${result.error}`);
        } else {
          this.options.logger(`Node "${nodeName}" failed but continuing: ${result.error}`, 'warn');
        }
      } else {
        nodeOutputs[nodeName] = result.outputs;
      }
    }

    executedNodes.add(nodeName);
  }

  /**
   * Execute a router node and continue with chosen routes
   */
  private async executeRouter(
    router: RouterNode,
    pipeline: Pipeline,
    nodeOutputs: Record<string, any>,
    nodeResults: NodeExecutionResult[],
    executedNodes: Set<string>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.options.logger(`Executing router: ${router.name}`, 'info');
      
      // Resolve inputs
      const inputs = this.resolveInputs(router.inputs, nodeOutputs);
      
      // Execute router to get next node(s)
      const nextNodes = await router.route(inputs);
      const nextNodeNames = Array.isArray(nextNodes) ? nextNodes : [nextNodes];
      
      const executionTime = Date.now() - startTime;
      this.options.logger(`Router "${router.name}" routed to: ${nextNodeNames.join(', ')} in ${executionTime}ms`, 'info');
      
      // Record router execution
      nodeResults.push({
        nodeName: router.name,
        success: true,
        outputs: { routedTo: nextNodeNames },
        executionTime
      });
      
      // Execute chosen routes
      for (const nextNodeName of nextNodeNames) {
        if (pipeline.nodes[nextNodeName]) {
          await this.executeDynamicFlow(nextNodeName, pipeline, nodeOutputs, nodeResults, executedNodes);
        } else {
          this.options.logger(`Router "${router.name}" tried to route to non-existent node "${nextNodeName}"`, 'warn');
        }
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.options.logger(`Router "${router.name}" failed after ${executionTime}ms: ${errorMessage}`, 'error');
      
      nodeResults.push({
        nodeName: router.name,
        success: false,
        error: errorMessage,
        executionTime
      });
      
      if (!this.options.continueOnError) {
        throw error;
      }
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
    
    if (isRouterNode(node)) {
      throw new Error(`Cannot execute router node "${nodeName}" as regular node`);
    }
    
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
