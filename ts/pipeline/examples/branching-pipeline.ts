/**
 * Branching Pipeline Example
 * 
 * This example demonstrates a more complex pipeline with branching and merging:
 *                    → SentimentAnalyzer →
 * DataSource → TextExtractor              → ReportGenerator
 *                    → KeywordExtractor  →
 */

import { 
  Pipeline, 
  PipelineRunner, 
  createSourceNode, 
  createNode,
  NodeBase
} from '../src/index';

// Define our data types
interface RawDocument {
  id: string;
  filename: string;
  content: string;
  metadata: Record<string, any>;
}

interface ExtractedText {
  id: string;
  text: string;
  sentences: string[];
}

interface SentimentResult {
  id: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
}

interface KeywordResult {
  id: string;
  keywords: string[];
  topics: string[];
}

interface AnalysisReport {
  documentCount: number;
  sentimentDistribution: Record<string, number>;
  topKeywords: string[];
  summary: string;
}

// Custom node using NodeBase for utilities
class SentimentAnalyzerNode extends NodeBase {
  name = 'sentimentAnalyzer';
  inputs = [{ name: 'texts', source: 'textExtractor:ExtractedTextArray:extractedTexts' }];

  async process(inputs: { texts: ExtractedText[] }): Promise<{ sentiments: SentimentResult[] }> {
    this.log(`Analyzing sentiment for ${inputs.texts.length} documents`);
    
    // Simulate sentiment analysis with retry logic for robustness
    const sentiments = await this.retry(async () => {
      return inputs.texts.map(text => {
        // Simple keyword-based sentiment analysis (in real world, you'd use ML)
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing'];
        
        const words = text.text.toLowerCase().split(/\s+/);
        const positiveCount = words.filter(word => positiveWords.includes(word)).length;
        const negativeCount = words.filter(word => negativeWords.includes(word)).length;
        
        let sentiment: 'positive' | 'negative' | 'neutral';
        let score: number;
        
        if (positiveCount > negativeCount) {
          sentiment = 'positive';
          score = Math.min(positiveCount / words.length * 10, 1);
        } else if (negativeCount > positiveCount) {
          sentiment = 'negative';
          score = Math.min(negativeCount / words.length * 10, 1);
        } else {
          sentiment = 'neutral';
          score = 0;
        }
        
        return {
          id: text.id,
          sentiment,
          score
        };
      });
    }, 3);

    this.log(`Completed sentiment analysis`);
    return { sentiments };
  }
}

async function runBranchingPipeline() {
  console.log('🌊 Running Branching Pipeline Example\n');

  // Step 1: Data Source
  const dataSource = createSourceNode<{ documents: RawDocument[] }>('dataSource', async () => {
    console.log('📁 Loading raw documents...');
    
    return {
      documents: [
        {
          id: 'doc1',
          filename: 'review1.txt',
          content: 'This product is amazing! I love how easy it is to use. Great design and excellent performance.',
          metadata: { source: 'product_reviews', rating: 5 }
        },
        {
          id: 'doc2',
          filename: 'review2.txt', 
          content: 'The service was terrible. Long wait times and the staff was not helpful at all. Very disappointing experience.',
          metadata: { source: 'service_reviews', rating: 1 }
        },
        {
          id: 'doc3',
          filename: 'article.txt',
          content: 'The weather today is cloudy with a chance of rain. Temperature is around 20 degrees celsius.',
          metadata: { source: 'weather_reports', temperature: 20 }
        }
      ]
    };
  });

  // Step 2: Text Extraction (processes all documents)
  const textExtractor = createNode<
    { docs: RawDocument[] },
    { extractedTexts: ExtractedText[] }
  >(
    'textExtractor',
    [{ name: 'docs', source: 'dataSource:RawDocumentArray:documents' }],
    async (inputs) => {
      console.log(`🔍 Extracting text from ${inputs.docs.length} documents...`);
      
      const extractedTexts = inputs.docs.map(doc => ({
        id: doc.id,
        text: doc.content,
        sentences: doc.content.split(/[.!?]+/).filter(s => s.trim().length > 0)
      }));

      return { extractedTexts };
    }
  );

  // Step 3a: Sentiment Analysis Branch
  const sentimentAnalyzer = new SentimentAnalyzerNode();

  // Step 3b: Keyword Extraction Branch
  const keywordExtractor = createNode<
    { texts: ExtractedText[] },
    { keywords: KeywordResult[] }
  >(
    'keywordExtractor',
    [{ name: 'texts', source: 'textExtractor:ExtractedTextArray:extractedTexts' }],
    async (inputs) => {
      console.log(`🔑 Extracting keywords from ${inputs.texts.length} documents...`);
      
      const keywords = inputs.texts.map(text => {
        // Simple keyword extraction (in real world, you'd use NLP libraries)
        const words = text.text.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3);
        
        const wordFreq = words.reduce((freq, word) => {
          freq[word] = (freq[word] || 0) + 1;
          return freq;
        }, {} as Record<string, number>);
        
        const topKeywords = Object.entries(wordFreq)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([word]) => word);
        
        // Extract topics based on keywords
        const topics = [];
        if (topKeywords.some(kw => ['product', 'design', 'performance', 'use'].includes(kw))) {
          topics.push('product_review');
        }
        if (topKeywords.some(kw => ['service', 'staff', 'wait', 'experience'].includes(kw))) {
          topics.push('service_review');
        }
        if (topKeywords.some(kw => ['weather', 'temperature', 'rain', 'cloudy'].includes(kw))) {
          topics.push('weather');
        }
        
        return {
          id: text.id,
          keywords: topKeywords,
          topics
        };
      });

      return { keywords };
    }
  );

  // Step 4: Report Generator (merges both branches)
  const reportGenerator = createNode<
    { 
      sentiments: SentimentResult[];
      keywords: KeywordResult[];
      originalDocs: RawDocument[];
    },
    { report: AnalysisReport }
  >(
    'reportGenerator',
    [
      { name: 'sentiments', source: 'sentimentAnalyzer:SentimentResultArray:sentiments' },
      { name: 'keywords', source: 'keywordExtractor:KeywordResultArray:keywords' },
      { name: 'originalDocs', source: 'dataSource:RawDocumentArray:documents' }
    ],
    async (inputs) => {
      console.log('📊 Generating comprehensive analysis report...');
      
      // Calculate sentiment distribution
      const sentimentDistribution = inputs.sentiments.reduce((dist, result) => {
        dist[result.sentiment] = (dist[result.sentiment] || 0) + 1;
        return dist;
      }, {} as Record<string, number>);
      
      // Get top keywords across all documents
      const allKeywords = inputs.keywords.flatMap(result => result.keywords);
      const keywordFreq = allKeywords.reduce((freq, keyword) => {
        freq[keyword] = (freq[keyword] || 0) + 1;
        return freq;
      }, {} as Record<string, number>);
      
      const topKeywords = Object.entries(keywordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword]) => keyword);
      
      // Generate summary
      const totalDocs = inputs.originalDocs.length;
      const positiveCount = sentimentDistribution.positive || 0;
      const negativeCount = sentimentDistribution.negative || 0;
      
      const summary = `Analyzed ${totalDocs} documents. ` +
        `${positiveCount} positive, ${negativeCount} negative sentiment detected. ` +
        `Top themes: ${topKeywords.slice(0, 3).join(', ')}.`;
      
      const report: AnalysisReport = {
        documentCount: totalDocs,
        sentimentDistribution,
        topKeywords,
        summary
      };

      return { report };
    }
  );

  // Create the pipeline
  const pipeline: Pipeline = {
    nodes: {
      dataSource,
      textExtractor,
      sentimentAnalyzer,
      keywordExtractor,
      reportGenerator
    }
  };

  // Execute the pipeline
  const runner = new PipelineRunner({
    logger: (message, level) => {
      const timestamp = new Date().toLocaleTimeString();
      const icon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`[${timestamp}] ${icon} ${message}`);
    }
  });

  const result = await runner.execute(pipeline);

  if (result.success) {
    console.log('\n✅ Pipeline executed successfully!');
    console.log(`⏱️  Total execution time: ${result.totalTime}ms\n`);
    
    // Display the analysis report
    const report = result.outputs.reportGenerator.report;
    console.log('=== ANALYSIS REPORT ===');
    console.log(`📈 Documents Processed: ${report.documentCount}`);
    console.log(`💭 Sentiment Distribution:`, report.sentimentDistribution);
    console.log(`🔤 Top Keywords: ${report.topKeywords.join(', ')}`);
    console.log(`📝 Summary: ${report.summary}`);
    
  } else {
    console.error('❌ Pipeline failed:', result.error);
  }

  return result;
}

// Run the example if this file is executed directly
if (require.main === module) {
  runBranchingPipeline()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Example failed:', error);
      process.exit(1);
    });
}

export { runBranchingPipeline };