/**
 * Tests for node utilities and base class
 */

import { NodeBase, createNode, createSourceNode, createSinkNode } from '../node';

describe('Node utilities', () => {
  describe('NodeBase', () => {
    class TestNode extends NodeBase {
      testLog(message: string, level?: 'info' | 'warn' | 'error') {
        this.log(message, level);
      }

      testValidateInputs<T>(inputs: T, required: string[]) {
        this.validateInputs(inputs, required);
      }

      testRetry<T>(operation: () => Promise<T>, attempts?: number) {
        return this.retry(operation, attempts);
      }

      testMeasureTime<T>(operation: () => Promise<T>) {
        return this.measureTime(operation);
      }

      testWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number) {
        return this.withTimeout(operation, timeoutMs);
      }
    }

    let testNode: TestNode;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      testNode = new TestNode();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });


    describe('validateInputs', () => {
      it('should pass for valid inputs', () => {
        const inputs = { a: 'value1', b: 'value2' };
        expect(() => testNode.testValidateInputs(inputs, ['a', 'b'])).not.toThrow();
      });

      it('should throw for missing required input', () => {
        const inputs = { a: 'value1' };
        expect(() => testNode.testValidateInputs(inputs, ['a', 'b']))
          .toThrow('Missing required input: b');
      });

      it('should throw for null input', () => {
        const inputs = { a: null, b: 'value2' };
        expect(() => testNode.testValidateInputs(inputs, ['a', 'b']))
          .toThrow('Required input "a" is null or undefined');
      });
    });

    describe('retry', () => {
      it('should succeed on first attempt', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        const result = await testNode.testRetry(operation, 3);
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should retry on failure and eventually succeed', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('fail 1'))
          .mockRejectedValueOnce(new Error('fail 2'))
          .mockResolvedValue('success');
        
        const result = await testNode.testRetry(operation, 3);
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should throw after all attempts fail', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('always fails'));
        
        await expect(testNode.testRetry(operation, 2))
          .rejects.toThrow('always fails');
        expect(operation).toHaveBeenCalledTimes(2);
      });
    });

    describe('measureTime', () => {
      it('should measure execution time', async () => {
        const operation = jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'result';
        });

        const { result, timeMs } = await testNode.testMeasureTime(operation);
        
        expect(result).toBe('result');
        expect(timeMs).toBeGreaterThan(0);
        expect(timeMs).toBeLessThan(100); // Should be quick
      });
    });

    describe('withTimeout', () => {
      it('should complete before timeout', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        const result = await testNode.testWithTimeout(operation, 1000);
        
        expect(result).toBe('success');
      });

      it('should timeout for slow operations', async () => {
        const operation = jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'success';
        });

        await expect(testNode.testWithTimeout(operation, 10))
          .rejects.toThrow('Operation timed out after 10ms');
      });
    });
  });

  describe('createNode', () => {
    it('should create a functional node', async () => {
      const processFn = jest.fn().mockResolvedValue({ output: 'result' });
      const node = createNode('testNode', [], processFn);

      expect(node.name).toBe('testNode');
      expect(node.inputs).toEqual([]);
      
      const result = await node.process({});
      expect(result).toEqual({ output: 'result' });
      expect(processFn).toHaveBeenCalledWith({});
    });
  });

  describe('createSourceNode', () => {
    it('should create a source node with no inputs', async () => {
      const processFn = jest.fn().mockResolvedValue({ data: 'source data' });
      const node = createSourceNode('source', processFn);

      expect(node.name).toBe('source');
      expect(node.inputs).toEqual([]);
      
      const result = await node.process({});
      expect(result).toEqual({ data: 'source data' });
      expect(processFn).toHaveBeenCalledWith();
    });
  });

  describe('createSinkNode', () => {
    it('should create a sink node with no outputs', async () => {
      const processFn = jest.fn().mockResolvedValue(undefined);
      const inputs = [{ name: 'data', source: 'source:string:output' }];
      const node = createSinkNode('sink', inputs, processFn);

      expect(node.name).toBe('sink');
      expect(node.inputs).toEqual(inputs);
      
      const result = await node.process({ data: 'test' });
      expect(result).toEqual({});
      expect(processFn).toHaveBeenCalledWith({ data: 'test' });
    });
  });
});