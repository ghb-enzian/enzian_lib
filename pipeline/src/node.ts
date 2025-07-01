/**
 * Node base class and utilities for the pipeline framework
 */

import { Node, NodeInputDeclaration } from './types';

/**
 * Optional base class providing common utilities for pipeline nodes.
 * Nodes can extend this class to get helpful utilities like logging, validation, and retry logic.
 */
export abstract class NodeBase {
  /**
   * Log a message with a specified level
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.constructor.name}]`;
    
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

  /**
   * Validate that all required inputs are present
   */
  protected validateInputs<T>(inputs: T, required: string[]): void {
    for (const key of required) {
      if (!(key in (inputs as any))) {
        throw new Error(`Missing required input: ${key}`);
      }
      
      const value = (inputs as any)[key];
      if (value === null || value === undefined) {
        throw new Error(`Required input "${key}" is null or undefined`);
      }
    }
  }

  /**
   * Handle errors consistently with logging
   */
  protected handleError(error: Error, context?: string): never {
    const message = context 
      ? `Error in ${context}: ${error.message}` 
      : `Error: ${error.message}`;
    
    this.log(message, 'error');
    throw error;
  }

  /**
   * Retry an operation with exponential backoff
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    attempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (i === attempts - 1) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, i);
        this.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, 'warn');
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Measure execution time of an operation
   */
  protected async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const startTime = Date.now();
    const result = await operation();
    const timeMs = Date.now() - startTime;
    
    return { result, timeMs };
  }

  /**
   * Create a timeout wrapper for an operation
   */
  protected withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}

/**
 * Helper function to create a simple functional node
 */
export function createNode<TInputs, TOutputs>(
  name: string,
  inputs: NodeInputDeclaration[],
  processFn: (inputs: TInputs) => Promise<TOutputs>
): Node<TInputs, TOutputs> {
  return {
    name,
    inputs,
    process: processFn
  };
}

/**
 * Helper function to create a node with no inputs (source node)
 */
export function createSourceNode<TOutputs>(
  name: string,
  processFn: () => Promise<TOutputs>
): Node<{}, TOutputs> {
  return createNode(name, [], async () => processFn());
}

/**
 * Helper function to create a node with no outputs (sink node)
 */
export function createSinkNode<TInputs>(
  name: string,
  inputs: NodeInputDeclaration[],
  processFn: (inputs: TInputs) => Promise<void>
): Node<TInputs, {}> {
  return createNode(name, inputs, async (inputs) => {
    await processFn(inputs);
    return {};
  });
}