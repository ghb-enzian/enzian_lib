/**
 * Tests for pipeline validation
 */

import { PipelineValidator, parseNodeReference, isValidNodeReference } from '../validator';
import { Pipeline, Node } from '../types';

describe('Validator', () => {
  describe('parseNodeReference', () => {
    it('should parse valid reference format', () => {
      const result = parseNodeReference('nodeA:string:output');
      
      expect(result).toEqual({
        nodeName: 'nodeA',
        typeName: 'string',
        outputName: 'output'
      });
    });

    it('should throw error for invalid format', () => {
      expect(() => parseNodeReference('invalid-format')).toThrow('Invalid node reference format');
      expect(() => parseNodeReference('node:output')).toThrow('Invalid node reference format');
      expect(() => parseNodeReference('node:type:output:extra')).toThrow('Invalid node reference format');
    });
  });

  describe('isValidNodeReference', () => {
    it('should validate correct formats', () => {
      expect(isValidNodeReference('node:string:output')).toBe(true);
      expect(isValidNodeReference('myNode:CustomType:result')).toBe(true);
      expect(isValidNodeReference('node123:type456:out789')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidNodeReference('invalid')).toBe(false);
      expect(isValidNodeReference('node:output')).toBe(false);
      expect(isValidNodeReference('node:type:output:extra')).toBe(false);
      expect(isValidNodeReference('node-with-dash:type:output')).toBe(false);
    });
  });

  describe('PipelineValidator', () => {
    const createMockNode = (name: string, inputs: any[]): Node => ({
      name,
      inputs,
      async process() { return {}; }
    });

    describe('validateReferences', () => {
      it('should validate correct references', () => {
        const pipeline: Pipeline = {
          nodes: {
            source: createMockNode('source', []),
            processor: createMockNode('processor', [
              { name: 'input', source: 'source:string:data' }
            ])
          }
        };

        expect(() => PipelineValidator.validateReferences(pipeline)).not.toThrow();
      });

      it('should throw for non-existent node reference', () => {
        const pipeline: Pipeline = {
          nodes: {
            processor: createMockNode('processor', [
              { name: 'input', source: 'nonexistent:string:data' }
            ])
          }
        };

        expect(() => PipelineValidator.validateReferences(pipeline))
          .toThrow('references non-existent node "nonexistent"');
      });

      it('should throw for self-reference', () => {
        const pipeline: Pipeline = {
          nodes: {
            selfRef: createMockNode('selfRef', [
              { name: 'input', source: 'selfRef:string:data' }
            ])
          }
        };

        expect(() => PipelineValidator.validateReferences(pipeline))
          .toThrow('cannot reference itself');
      });
    });

    describe('detectCycles', () => {
      it('should pass for acyclic pipeline', () => {
        const pipeline: Pipeline = {
          nodes: {
            a: createMockNode('a', []),
            b: createMockNode('b', [{ name: 'input', source: 'a:string:output' }]),
            c: createMockNode('c', [{ name: 'input', source: 'b:string:output' }])
          }
        };

        expect(() => PipelineValidator.detectCycles(pipeline)).not.toThrow();
      });

      it('should detect simple cycle', () => {
        const pipeline: Pipeline = {
          nodes: {
            a: createMockNode('a', [{ name: 'input', source: 'b:string:output' }]),
            b: createMockNode('b', [{ name: 'input', source: 'a:string:output' }])
          }
        };

        expect(() => PipelineValidator.detectCycles(pipeline))
          .toThrow('Circular dependency detected');
      });
    });

    describe('getExecutionOrder', () => {
      it('should return correct execution order', () => {
        const pipeline: Pipeline = {
          nodes: {
            c: createMockNode('c', [{ name: 'input', source: 'b:string:output' }]),
            a: createMockNode('a', []),
            b: createMockNode('b', [{ name: 'input', source: 'a:string:output' }])
          }
        };

        const order = PipelineValidator.getExecutionOrder(pipeline);
        expect(order).toEqual(['a', 'b', 'c']);
      });
    });

    describe('findSourceNodes', () => {
      it('should find nodes with no inputs', () => {
        const pipeline: Pipeline = {
          nodes: {
            source1: createMockNode('source1', []),
            source2: createMockNode('source2', []),
            processor: createMockNode('processor', [
              { name: 'input', source: 'source1:string:output' }
            ])
          }
        };

        const sources = PipelineValidator.findSourceNodes(pipeline);
        expect(sources.sort()).toEqual(['source1', 'source2']);
      });
    });

    describe('validate', () => {
      it('should pass for valid pipeline', () => {
        const pipeline: Pipeline = {
          nodes: {
            source: createMockNode('source', []),
            processor: createMockNode('processor', [
              { name: 'input', source: 'source:string:data' }
            ])
          }
        };

        expect(() => PipelineValidator.validate(pipeline)).not.toThrow();
      });

      it('should throw for empty pipeline', () => {
        const pipeline: Pipeline = { nodes: {} };
        
        expect(() => PipelineValidator.validate(pipeline))
          .toThrow('Pipeline cannot be empty');
      });

      it('should throw for pipeline with no source nodes', () => {
        const pipeline: Pipeline = {
          nodes: {
            a: createMockNode('a', [{ name: 'input', source: 'b:string:output' }]),
            b: createMockNode('b', [{ name: 'input', source: 'c:string:output' }]),
            c: createMockNode('c', [{ name: 'input', source: 'a:string:output' }])
          }
        };

        // This pipeline has a cycle, so cycle detection will throw first
        expect(() => PipelineValidator.validate(pipeline))
          .toThrow('Circular dependency detected');
      });

      it('should throw for pipeline with no source nodes (non-cyclic)', () => {
        const pipeline: Pipeline = {
          nodes: {
            a: createMockNode('a', [{ name: 'input', source: 'b:string:output' }]),
            b: createMockNode('b', [{ name: 'input', source: 'c:string:output' }]),
            c: createMockNode('c', [{ name: 'input', source: 'd:string:output' }]),
            d: createMockNode('d', [{ name: 'input', source: 'e:string:output' }])
          }
        };

        // This will fail on reference validation (node 'e' doesn't exist)
        expect(() => PipelineValidator.validate(pipeline))
          .toThrow('references non-existent node "e"');
      });
    });
  });
});