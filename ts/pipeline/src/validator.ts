/**
 * Pipeline validation utilities
 */

import { Node, RouterNode, Pipeline, ParsedNodeReference } from './types';

/**
 * Regular expression for validating node reference format: "nodename:typename:outputname"
 */
const NODE_REFERENCE_PATTERN = /^(\w+):(\w+):(\w+)$/;

/**
 * Parse a node reference string into its components
 */
export function parseNodeReference(ref: string): ParsedNodeReference {
  const match = ref.match(NODE_REFERENCE_PATTERN);
  if (!match) {
    throw new Error(
      `Invalid node reference format: "${ref}". Expected format: "nodename:typename:outputname"`
    );
  }
  
  return {
    nodeName: match[1],
    typeName: match[2],
    outputName: match[3]
  };
}

/**
 * Validate that a node reference string has the correct format
 */
export function isValidNodeReference(ref: string): boolean {
  return NODE_REFERENCE_PATTERN.test(ref);
}

/**
 * Pipeline validator class providing comprehensive validation
 */
export class PipelineValidator {
  /**
   * Validate all node references in a pipeline
   */
  static validateReferences(pipeline: Pipeline): void {
    const nodeNames = Object.keys(pipeline.nodes);
    
    for (const [nodeName, node] of Object.entries(pipeline.nodes)) {
      this.validateNodeReferences(node, nodeNames, nodeName);
    }
  }

  /**
   * Validate references for a single node
   */
  private static validateNodeReferences(node: Node | RouterNode, availableNodes: string[], currentNodeName: string): void {
    for (const input of node.inputs) {
      // Validate reference format
      let parsed: ParsedNodeReference;
      try {
        parsed = parseNodeReference(input.source);
      } catch (error) {
        throw new Error(
          `Node "${currentNodeName}" has invalid input reference "${input.source}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      // Check if referenced node exists
      if (!availableNodes.includes(parsed.nodeName)) {
        throw new Error(
          `Node "${currentNodeName}" references non-existent node "${parsed.nodeName}" in input "${input.name}"`
        );
      }
      
      // Check for self-reference
      if (parsed.nodeName === currentNodeName) {
        throw new Error(
          `Node "${currentNodeName}" cannot reference itself in input "${input.name}"`
        );
      }
    }
  }

  /**
   * Detect circular dependencies in the pipeline using topological sort
   */
  static detectCycles(pipeline: Pipeline): void {
    const nodeNames = Object.keys(pipeline.nodes);
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const path: string[] = [];
    
    function visit(nodeName: string): void {
      if (visiting.has(nodeName)) {
        const cycleStart = path.indexOf(nodeName);
        const cycle = path.slice(cycleStart).concat(nodeName);
        throw new Error(
          `Circular dependency detected: ${cycle.join(' → ')}`
        );
      }
      
      if (visited.has(nodeName)) {
        return;
      }
      
      visiting.add(nodeName);
      path.push(nodeName);
      
      const node = pipeline.nodes[nodeName];
      for (const input of node.inputs) {
        const { nodeName: depNodeName } = parseNodeReference(input.source);
        visit(depNodeName);
      }
      
      visiting.delete(nodeName);
      visited.add(nodeName);
      path.pop();
    }
    
    for (const nodeName of nodeNames) {
      if (!visited.has(nodeName)) {
        visit(nodeName);
      }
    }
  }

  /**
   * Get the execution order for nodes based on dependencies
   */
  static getExecutionOrder(pipeline: Pipeline): string[] {
    const nodeNames = Object.keys(pipeline.nodes);
    const visited = new Set<string>();
    const order: string[] = [];
    
    function visit(nodeName: string): void {
      if (visited.has(nodeName)) {
        return;
      }
      
      visited.add(nodeName);
      
      const node = pipeline.nodes[nodeName];
      for (const input of node.inputs) {
        const { nodeName: depNodeName } = parseNodeReference(input.source);
        visit(depNodeName);
      }
      
      order.push(nodeName);
    }
    
    for (const nodeName of nodeNames) {
      visit(nodeName);
    }
    
    return order;
  }

  /**
   * Find all source nodes (nodes with no inputs)
   */
  static findSourceNodes(pipeline: Pipeline): string[] {
    return Object.entries(pipeline.nodes)
      .filter(([_, node]) => node.inputs.length === 0)
      .map(([name, _]) => name);
  }

  /**
   * Find all sink nodes (nodes that no other node depends on)
   */
  static findSinkNodes(pipeline: Pipeline): string[] {
    const nodeNames = Object.keys(pipeline.nodes);
    const referencedNodes = new Set<string>();
    
    // Collect all referenced nodes
    for (const node of Object.values(pipeline.nodes)) {
      for (const input of node.inputs) {
        const { nodeName } = parseNodeReference(input.source);
        referencedNodes.add(nodeName);
      }
    }
    
    // Return nodes that are not referenced by any other node
    return nodeNames.filter(name => !referencedNodes.has(name));
  }

  /**
   * Comprehensive pipeline validation
   */
  static validate(pipeline: Pipeline): void {
    // Check for empty pipeline
    if (Object.keys(pipeline.nodes).length === 0) {
      throw new Error('Pipeline cannot be empty');
    }
    
    // Validate all node references
    this.validateReferences(pipeline);
    
    // Check for circular dependencies
    this.detectCycles(pipeline);
    
    // Ensure there's at least one source node
    const sourceNodes = this.findSourceNodes(pipeline);
    if (sourceNodes.length === 0) {
      throw new Error('Pipeline must have at least one source node (node with no inputs)');
    }
  }
}