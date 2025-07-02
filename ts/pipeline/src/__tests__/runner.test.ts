/**
 * Tests for pipeline runner
 */

import { PipelineRunner, executePipeline } from '../runner';
import { Pipeline, Node } from '../types';

describe('PipelineRunner', () => {
  const createMockNode = (
    name: string, 
    inputs: any[], 
    processFn: (inputs: any) => Promise<any>
  ): Node => ({
    name,
    inputs,
    process: processFn
  });

  describe('execute', () => {
    it('should execute simple linear pipeline', async () => {
      const sourceProcess = jest.fn().mockResolvedValue({ data: 'hello' });
      const processorProcess = jest.fn().mockResolvedValue({ result: 'HELLO' });

      const pipeline: Pipeline = {
        nodes: {
          source: createMockNode('source', [], sourceProcess),
          processor: createMockNode('processor', [
            { name: 'input', source: 'source:string:data' }
          ], processorProcess)
        }
      };

      const runner = new PipelineRunner();
      const result = await runner.execute(pipeline);

      expect(result.success).toBe(true);
      expect(result.nodeResults).toHaveLength(2);
      expect(result.outputs.source).toEqual({ data: 'hello' });
      expect(result.outputs.processor).toEqual({ result: 'HELLO' });
      
      expect(sourceProcess).toHaveBeenCalledWith({});
      expect(processorProcess).toHaveBeenCalledWith({ input: 'hello' });
    });

    it('should execute branching pipeline', async () => {
      const sourceProcess = jest.fn().mockResolvedValue({ 
        text: 'hello', 
        number: 42 
      });
      const textProcess = jest.fn().mockResolvedValue({ upper: 'HELLO' });
      const numberProcess = jest.fn().mockResolvedValue({ doubled: 84 });

      const pipeline: Pipeline = {
        nodes: {
          source: createMockNode('source', [], sourceProcess),
          textProcessor: createMockNode('textProcessor', [
            { name: 'text', source: 'source:string:text' }
          ], textProcess),
          numberProcessor: createMockNode('numberProcessor', [
            { name: 'number', source: 'source:number:number' }
          ], numberProcess)
        }
      };

      const runner = new PipelineRunner();
      const result = await runner.execute(pipeline);

      expect(result.success).toBe(true);
      expect(result.nodeResults).toHaveLength(3);
      
      expect(textProcess).toHaveBeenCalledWith({ text: 'hello' });
      expect(numberProcess).toHaveBeenCalledWith({ number: 42 });
    });

    it('should handle node execution failure', async () => {
      const sourceProcess = jest.fn().mockResolvedValue({ data: 'test' });
      const failingProcess = jest.fn().mockRejectedValue(new Error('Processing failed'));

      const pipeline: Pipeline = {
        nodes: {
          source: createMockNode('source', [], sourceProcess),
          failing: createMockNode('failing', [
            { name: 'input', source: 'source:string:data' }
          ], failingProcess)
        }
      };

      const runner = new PipelineRunner();
      const result = await runner.execute(pipeline);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Pipeline failed at node "failing"');
      expect(result.nodeResults).toHaveLength(2);
      expect(result.nodeResults[1].success).toBe(false);
    });

    it('should continue on error when configured', async () => {
      const sourceProcess = jest.fn().mockResolvedValue({ data: 'test' });
      const failingProcess = jest.fn().mockRejectedValue(new Error('Processing failed'));
      const successProcess = jest.fn().mockResolvedValue({ result: 'success' });

      const pipeline: Pipeline = {
        nodes: {
          source: createMockNode('source', [], sourceProcess),
          failing: createMockNode('failing', [
            { name: 'input', source: 'source:string:data' }
          ], failingProcess),
          success: createMockNode('success', [], successProcess)
        }
      };

      const runner = new PipelineRunner({ continueOnError: true });
      const result = await runner.execute(pipeline);

      expect(result.success).toBe(true);
      expect(result.nodeResults).toHaveLength(3);
      expect(result.nodeResults[1].success).toBe(false); // failing node
      expect(result.nodeResults[2].success).toBe(true);  // success node
    });

    it('should handle timeout', async () => {
      const slowProcess = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { result: 'slow' };
      });

      const pipeline: Pipeline = {
        nodes: {
          slow: createMockNode('slow', [], slowProcess)
        }
      };

      const runner = new PipelineRunner({ nodeTimeout: 50 });
      const result = await runner.execute(pipeline);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should validate pipeline before execution', async () => {
      const pipeline: Pipeline = {
        nodes: {
          invalid: createMockNode('invalid', [
            { name: 'input', source: 'nonexistent:string:data' }
          ], async () => ({}))
        }
      };

      const runner = new PipelineRunner();
      const result = await runner.execute(pipeline);

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-existent node');
    });
  });

  describe('executePipeline convenience function', () => {
    it('should execute pipeline with default options', async () => {
      const pipeline: Pipeline = {
        nodes: {
          source: createMockNode('source', [], async () => ({ data: 'test' }))
        }
      };

      const result = await executePipeline(pipeline);
      
      expect(result.success).toBe(true);
      expect(result.outputs.source).toEqual({ data: 'test' });
    });

    it('should accept custom options', async () => {
      const loggerSpy = jest.fn();
      const pipeline: Pipeline = {
        nodes: {
          source: createMockNode('source', [], async () => ({ data: 'test' }))
        }
      };

      await executePipeline(pipeline, { logger: loggerSpy });
      
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});