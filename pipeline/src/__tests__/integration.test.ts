/**
 * Integration tests for the complete pipeline system
 */

import { 
  Pipeline, 
  PipelineRunner, 
  createNode, 
  createSourceNode, 
  createSinkNode,
  NodeBase 
} from '../index';

describe('Pipeline Integration', () => {
  describe('End-to-end pipeline execution', () => {
    it('should execute a complete data processing pipeline', async () => {
      // Create a data processing pipeline:
      // DataSource → TextProcessor → Analyzer → Reporter

      const dataSource = createSourceNode('dataSource', async () => ({
        documents: [
          { id: 1, content: 'Hello world' },
          { id: 2, content: 'TypeScript is great' }
        ]
      }));

      const textProcessor = createNode(
        'textProcessor',
        [{ name: 'docs', source: 'dataSource:DocumentArray:documents' }],
        async (inputs: any) => ({
          processedTexts: inputs.docs.map((doc: any) => ({
            id: doc.id,
            content: doc.content.toUpperCase(),
            wordCount: doc.content.split(' ').length
          }))
        })
      );

      const analyzer = createNode(
        'analyzer',
        [{ name: 'texts', source: 'textProcessor:ProcessedTextArray:processedTexts' }],
        async (inputs: any) => ({
          analysis: {
            totalDocuments: inputs.texts.length,
            totalWords: inputs.texts.reduce((sum: number, text: any) => sum + text.wordCount, 0),
            averageWords: inputs.texts.reduce((sum: number, text: any) => sum + text.wordCount, 0) / inputs.texts.length
          }
        })
      );

      const reporter = createSinkNode(
        'reporter',
        [
          { name: 'texts', source: 'textProcessor:ProcessedTextArray:processedTexts' },
          { name: 'analysis', source: 'analyzer:Analysis:analysis' }
        ],
        async (inputs: any) => {
          // This would normally write to file/database
          expect(inputs.analysis.totalDocuments).toBe(2);
          expect(inputs.analysis.totalWords).toBe(5); // "HELLO WORLD" + "TYPESCRIPT IS GREAT"
          expect(inputs.texts).toHaveLength(2);
        }
      );

      const pipeline: Pipeline = {
        nodes: {
          dataSource,
          textProcessor,
          analyzer,
          reporter
        }
      };

      const runner = new PipelineRunner();
      const result = await runner.execute(pipeline);

      expect(result.success).toBe(true);
      expect(result.nodeResults).toHaveLength(4);
      expect(result.outputs.dataSource.documents).toHaveLength(2);
      expect(result.outputs.analyzer.analysis.totalDocuments).toBe(2);
    });

    it('should handle complex branching and merging', async () => {
      // Create a complex pipeline:
      //        → ProcessorA →
      // Source              → Merger
      //        → ProcessorB →

      const source = createSourceNode('source', async () => ({
        data: [1, 2, 3, 4, 5]
      }));

      const processorA = createNode(
        'processorA',
        [{ name: 'numbers', source: 'source:numberArray:data' }],
        async (inputs: any) => ({
          evens: inputs.numbers.filter((n: number) => n % 2 === 0)
        })
      );

      const processorB = createNode(
        'processorB',
        [{ name: 'numbers', source: 'source:numberArray:data' }],
        async (inputs: any) => ({
          odds: inputs.numbers.filter((n: number) => n % 2 === 1)
        })
      );

      const merger = createNode(
        'merger',
        [
          { name: 'evens', source: 'processorA:numberArray:evens' },
          { name: 'odds', source: 'processorB:numberArray:odds' }
        ],
        async (inputs: any) => ({
          summary: {
            evenCount: inputs.evens.length,
            oddCount: inputs.odds.length,
            evenSum: inputs.evens.reduce((a: number, b: number) => a + b, 0),
            oddSum: inputs.odds.reduce((a: number, b: number) => a + b, 0)
          }
        })
      );

      const pipeline: Pipeline = {
        nodes: { source, processorA, processorB, merger }
      };

      const result = await new PipelineRunner().execute(pipeline);

      expect(result.success).toBe(true);
      expect(result.outputs.merger.summary).toEqual({
        evenCount: 2,
        oddCount: 3,
        evenSum: 6, // 2 + 4
        oddSum: 9   // 1 + 3 + 5
      });
    });
  });

  describe('Real-world scenario: File processing pipeline', () => {
    class FileReaderNode extends NodeBase {
      name = 'fileReader';
      inputs = [];

      async process() {
        this.log('Reading files from directory');
        
        // Simulate reading files
        return {
          files: [
            { name: 'doc1.txt', content: 'The quick brown fox' },
            { name: 'doc2.txt', content: 'jumps over the lazy dog' }
          ]
        };
      }
    }

    class TextAnalyzerNode extends NodeBase {
      name = 'textAnalyzer';
      inputs = [{ name: 'files', source: 'fileReader:FileArray:files' }];

      async process(inputs: any) {
        this.log(`Analyzing ${inputs.files.length} files`);
        
        return {
          analyses: inputs.files.map((file: any) => ({
            fileName: file.name,
            wordCount: file.content.split(' ').length,
            characterCount: file.content.length,
            keywords: file.content.toLowerCase().split(' ')
          }))
        };
      }
    }

    class ReportGeneratorNode extends NodeBase {
      name = 'reportGenerator';
      inputs = [
        { name: 'files', source: 'fileReader:FileArray:files' },
        { name: 'analyses', source: 'textAnalyzer:AnalysisArray:analyses' }
      ];

      async process(inputs: any) {
        this.log('Generating executive summary');
        
        const totalWords = inputs.analyses.reduce((sum: number, analysis: any) => 
          sum + analysis.wordCount, 0);
        
        return {
          executiveSummary: {
            totalFiles: inputs.files.length,
            totalWords,
            averageWordsPerFile: totalWords / inputs.files.length,
            processedAt: new Date().toISOString()
          }
        };
      }
    }

    it('should process files and generate executive summary', async () => {
      const pipeline: Pipeline = {
        nodes: {
          fileReader: new FileReaderNode(),
          textAnalyzer: new TextAnalyzerNode(),
          reportGenerator: new ReportGeneratorNode()
        }
      };

      const result = await new PipelineRunner().execute(pipeline);

      expect(result.success).toBe(true);
      expect(result.outputs.reportGenerator.executiveSummary).toMatchObject({
        totalFiles: 2,
        totalWords: 9, // "The quick brown fox" (4) + "jumps over the lazy dog" (5) = 9
        averageWordsPerFile: 4.5
      });
    });
  });
});