/**
 * Tests for core types and interfaces
 */

import { Node, NodeInputDeclaration, ParsedNodeReference } from '../types';

describe('Types', () => {
  describe('NodeInputDeclaration', () => {
    it('should have required properties', () => {
      const input: NodeInputDeclaration = {
        name: 'testInput',
        source: 'sourceNode:string:output'
      };

      expect(input.name).toBe('testInput');
      expect(input.source).toBe('sourceNode:string:output');
      expect(input.required).toBeUndefined(); // Optional property
    });

    it('should support optional required property', () => {
      const input: NodeInputDeclaration = {
        name: 'testInput',
        source: 'sourceNode:string:output',
        required: false
      };

      expect(input.required).toBe(false);
    });
  });

  describe('Node interface', () => {
    it('should enforce correct structure', () => {
      const mockNode: Node<{ input: string }, { output: number }> = {
        name: 'testNode',
        inputs: [
          { name: 'input', source: 'source:string:data' }
        ],
        async process(inputs) {
          return { output: inputs.input.length };
        }
      };

      expect(mockNode.name).toBe('testNode');
      expect(mockNode.inputs).toHaveLength(1);
      expect(typeof mockNode.process).toBe('function');
    });

    it('should handle async processing', async () => {
      const mockNode: Node<{ value: number }, { doubled: number }> = {
        name: 'doubler',
        inputs: [
          { name: 'value', source: 'input:number:value' }
        ],
        async process(inputs) {
          return { doubled: inputs.value * 2 };
        }
      };

      const result = await mockNode.process({ value: 5 });
      expect(result.doubled).toBe(10);
    });
  });

  describe('ParsedNodeReference', () => {
    it('should have correct structure', () => {
      const parsed: ParsedNodeReference = {
        nodeName: 'testNode',
        typeName: 'string',
        outputName: 'result'
      };

      expect(parsed.nodeName).toBe('testNode');
      expect(parsed.typeName).toBe('string');
      expect(parsed.outputName).toBe('result');
    });
  });
});