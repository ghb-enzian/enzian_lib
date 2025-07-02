/**
 * File Processing Pipeline Example
 * 
 * This example demonstrates a realistic file processing scenario similar to 
 * the GenAI offline pipeline we discussed:
 * 
 * FileLoader → ContentExtractor → LLMAnalyzer → ExecutiveSummaryGenerator
 */

import { 
  Pipeline, 
  PipelineRunner, 
  createSourceNode, 
  createNode,
  NodeBase
} from '../src/index';

// Define our data types
interface FileData {
  path: string;
  name: string;
  content: string;
  size: number;
  type: string;
}

interface ExtractedContent {
  fileId: string;
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    language: string;
  };
}

interface LLMAnalysis {
  fileId: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

interface ExecutiveSummary {
  totalFiles: number;
  totalWords: number;
  overallSummary: string;
  keyFindings: string[];
  topTopics: string[];
  recommendations: string[];
  processedAt: string;
}

// Custom nodes demonstrating real-world processing
class FileLoaderNode extends NodeBase {
  name = 'fileLoader';
  inputs = [];

  async process(): Promise<{ files: FileData[] }> {
    this.log('Loading files from directory');
    
    // Simulate loading files from a directory
    // In real implementation, this would read from filesystem/cloud storage
    const files: FileData[] = [
      {
        path: '/documents/quarterly-report-q1.pdf',
        name: 'quarterly-report-q1.pdf', 
        content: `QUARTERLY REPORT Q1 2024
        
        Executive Summary:
        Our company has shown remarkable growth in Q1 2024, with revenue increasing by 25% compared to the previous quarter. 
        The new product launches have been well-received by customers, contributing significantly to our market expansion.
        
        Key Achievements:
        - Launched 3 new product lines
        - Expanded into 2 new markets
        - Increased customer satisfaction by 15%
        - Improved operational efficiency by 20%
        
        Financial Performance:
        Revenue: $5.2M (+25% QoQ)
        Profit Margin: 18.5% (+2.3% QoQ)
        Customer Acquisition Cost: Reduced by 12%
        
        Challenges:
        - Supply chain disruptions in March
        - Increased competition in core markets
        - Rising material costs affecting margins
        
        Outlook:
        We remain optimistic about Q2 performance with new partnerships and product improvements in the pipeline.`,
        size: 2048,
        type: 'application/pdf'
      },
      {
        path: '/documents/customer-feedback-analysis.docx',
        name: 'customer-feedback-analysis.docx',
        content: `CUSTOMER FEEDBACK ANALYSIS - Q1 2024
        
        Overview:
        This document analyzes customer feedback collected through surveys, support tickets, and social media mentions
        during the first quarter of 2024.
        
        Positive Feedback Themes:
        - Product quality and reliability (mentioned 487 times)
        - Excellent customer service response times (mentioned 324 times)  
        - User-friendly interface design (mentioned 298 times)
        - Competitive pricing (mentioned 156 times)
        
        Areas for Improvement:
        - Mobile app performance issues (mentioned 203 times)
        - Documentation needs improvement (mentioned 178 times)
        - Shipping delays (mentioned 145 times)
        - Limited payment options (mentioned 89 times)
        
        Customer Satisfaction Metrics:
        - Overall satisfaction: 4.2/5.0 (+0.3 from Q4)
        - Net Promoter Score: 68 (+5 from Q4)
        - Customer retention rate: 92% (+2% from Q4)
        
        Recommendations:
        1. Prioritize mobile app optimization
        2. Invest in documentation revamp
        3. Explore additional shipping partners
        4. Add more payment methods`,
        size: 1536,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      },
      {
        path: '/documents/market-research-summary.txt',
        name: 'market-research-summary.txt',
        content: `MARKET RESEARCH SUMMARY
        
        Industry Overview:
        The SaaS industry continues to show strong growth with a projected CAGR of 18% through 2027.
        Key drivers include digital transformation initiatives and remote work adoption.
        
        Competitive Landscape:
        - Market leader: Competitor A (35% market share)
        - Our position: 3rd place (12% market share)
        - Emerging threats: 5 new startups with innovative approaches
        
        Customer Segments:
        1. Enterprise (>1000 employees): 45% of revenue
        2. Mid-market (100-1000 employees): 35% of revenue  
        3. Small business (<100 employees): 20% of revenue
        
        Trends and Opportunities:
        - AI integration becoming standard expectation
        - Sustainability features gaining importance
        - Mobile-first approach critical for SMB segment
        - Integration capabilities key differentiator
        
        Threats:
        - Economic uncertainty affecting enterprise budgets
        - Increased scrutiny on data privacy
        - Commoditization of basic features
        
        Strategic Recommendations:
        - Accelerate AI feature development
        - Strengthen enterprise security offerings
        - Expand partnership ecosystem`,
        size: 1024,
        type: 'text/plain'
      }
    ];

    this.log(`Loaded ${files.length} files for processing`);
    return { files };
  }
}

class ContentExtractorNode extends NodeBase {
  name = 'contentExtractor';
  inputs = [{ name: 'files', source: 'fileLoader:FileDataArray:files' }];

  async process(inputs: { files: FileData[] }): Promise<{ extractedContent: ExtractedContent[] }> {
    this.log(`Extracting content from ${inputs.files.length} files`);
    
    const extractedContent = await Promise.all(
      inputs.files.map(async (file, index) => {
        // Simulate content extraction with processing time
        await this.sleep(100); // Simulate processing delay
        
        const wordCount = file.content.split(/\s+/).length;
        const pageCount = file.type === 'application/pdf' ? Math.ceil(wordCount / 250) : undefined;
        
        // Simple language detection (in real world, use proper library)
        const language = 'en'; // Assume English for this example
        
        this.log(`Extracted ${wordCount} words from ${file.name}`);
        
        return {
          fileId: `file_${index + 1}`,
          text: file.content,
          metadata: {
            pageCount,
            wordCount,
            language
          }
        };
      })
    );

    return { extractedContent };
  }
}

class LLMAnalyzerNode extends NodeBase {
  name = 'llmAnalyzer';
  inputs = [{ name: 'content', source: 'contentExtractor:ExtractedContentArray:extractedContent' }];

  async process(inputs: { content: ExtractedContent[] }): Promise<{ analyses: LLMAnalysis[] }> {
    this.log(`Analyzing ${inputs.content.length} documents with LLM`);
    
    // Simulate LLM analysis with retry logic (LLM APIs can be flaky)
    const analyses = await this.retry(async () => {
      return Promise.all(
        inputs.content.map(async (content) => {
          // Simulate LLM API call delay
          await this.sleep(500);
          
          this.log(`Processing document ${content.fileId}`);
          
          // Mock LLM analysis (in real world, this would call actual LLM API)
          const text = content.text.toLowerCase();
          
          // Extract key points (simulate by finding sentences with important keywords)
          const sentences = content.text.split(/[.!?]+/).filter(s => s.trim().length > 20);
          const importantKeywords = ['revenue', 'growth', 'customer', 'market', 'recommendation', 'challenge'];
          const keyPoints = sentences
            .filter(sentence => importantKeywords.some(keyword => sentence.toLowerCase().includes(keyword)))
            .slice(0, 3)
            .map(s => s.trim());
          
          // Extract topics
          const topics = [];
          if (text.includes('revenue') || text.includes('financial')) topics.push('financial_performance');
          if (text.includes('customer') || text.includes('feedback')) topics.push('customer_experience');
          if (text.includes('market') || text.includes('competitive')) topics.push('market_analysis');
          if (text.includes('product') || text.includes('features')) topics.push('product_development');
          
          // Sentiment analysis
          const positiveWords = ['growth', 'excellent', 'improved', 'successful', 'optimistic'];
          const negativeWords = ['challenge', 'problem', 'disruption', 'threat', 'decline'];
          
          const positiveCount = positiveWords.filter(word => text.includes(word)).length;
          const negativeCount = negativeWords.filter(word => text.includes(word)).length;
          
          let sentiment: 'positive' | 'negative' | 'neutral';
          if (positiveCount > negativeCount) sentiment = 'positive';
          else if (negativeCount > positiveCount) sentiment = 'negative';
          else sentiment = 'neutral';
          
          // Generate summary
          const summary = sentences.slice(0, 2).join('. ') + '.';
          
          return {
            fileId: content.fileId,
            summary,
            keyPoints,
            topics,
            sentiment,
            confidence: 0.85 + Math.random() * 0.1 // Mock confidence score
          };
        })
      );
    }, 3);

    this.log('Completed LLM analysis for all documents');
    return { analyses };
  }
}

class ExecutiveSummaryGeneratorNode extends NodeBase {
  name = 'executiveSummaryGenerator';
  inputs = [
    { name: 'files', source: 'fileLoader:FileDataArray:files' },
    { name: 'content', source: 'contentExtractor:ExtractedContentArray:extractedContent' },
    { name: 'analyses', source: 'llmAnalyzer:LLMAnalysisArray:analyses' }
  ];

  async process(inputs: {
    files: FileData[];
    content: ExtractedContent[];
    analyses: LLMAnalysis[];
  }): Promise<{ executiveSummary: ExecutiveSummary }> {
    this.log('Generating executive summary');
    
    const { files, content, analyses } = inputs;
    
    // Calculate aggregate metrics
    const totalFiles = files.length;
    const totalWords = content.reduce((sum, c) => sum + c.metadata.wordCount, 0);
    
    // Extract top topics across all documents
    const allTopics = analyses.flatMap(a => a.topics);
    const topicFreq = allTopics.reduce((freq, topic) => {
      freq[topic] = (freq[topic] || 0) + 1;
      return freq;
    }, {} as Record<string, number>);
    
    const topTopics = Object.entries(topicFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
    
    // Extract key findings from all analyses
    const allKeyPoints = analyses.flatMap(a => a.keyPoints);
    const keyFindings = allKeyPoints.slice(0, 5); // Top 5 findings
    
    // Generate overall summary
    const positiveCount = analyses.filter(a => a.sentiment === 'positive').length;
    const neutralCount = analyses.filter(a => a.sentiment === 'neutral').length;
    const negativeCount = analyses.filter(a => a.sentiment === 'negative').length;
    
    const overallSummary = `Analysis of ${totalFiles} documents (${totalWords.toLocaleString()} words total) reveals ` +
      `${positiveCount} positive, ${neutralCount} neutral, and ${negativeCount} negative sentiment documents. ` +
      `Key themes include ${topTopics.slice(0, 3).join(', ')}.`;
    
    // Generate recommendations based on analysis
    const recommendations = [];
    if (topTopics.includes('customer_experience')) {
      recommendations.push('Focus on customer experience improvements based on feedback analysis');
    }
    if (topTopics.includes('financial_performance')) {
      recommendations.push('Continue monitoring financial metrics and growth strategies');
    }
    if (topTopics.includes('market_analysis')) {
      recommendations.push('Stay competitive by tracking market trends and competitor activities');
    }
    if (topTopics.includes('product_development')) {
      recommendations.push('Prioritize product development initiatives highlighted in the analysis');
    }
    
    const executiveSummary: ExecutiveSummary = {
      totalFiles,
      totalWords,
      overallSummary,
      keyFindings,
      topTopics,
      recommendations,
      processedAt: new Date().toISOString()
    };

    this.log('Executive summary generated successfully');
    return { executiveSummary };
  }
}

async function runFileProcessingPipeline() {
  console.log('📁 Running File Processing Pipeline Example\n');

  // Create the pipeline
  const pipeline: Pipeline = {
    nodes: {
      fileLoader: new FileLoaderNode(),
      contentExtractor: new ContentExtractorNode(),
      llmAnalyzer: new LLMAnalyzerNode(),
      executiveSummaryGenerator: new ExecutiveSummaryGeneratorNode()
    }
  };

  // Execute the pipeline with custom options
  const runner = new PipelineRunner({
    nodeTimeout: 10000, // 10 second timeout per node
    logger: (message, level) => {
      const timestamp = new Date().toLocaleTimeString();
      const icon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`[${timestamp}] ${icon} ${message}`);
    }
  });

  const result = await runner.execute(pipeline);

  if (result.success) {
    console.log('\n✅ File Processing Pipeline completed successfully!');
    console.log(`⏱️  Total execution time: ${result.totalTime}ms\n`);
    
    // Display the executive summary
    const summary = result.outputs.executiveSummaryGenerator.executiveSummary;
    console.log('=== EXECUTIVE SUMMARY ===');
    console.log(`📊 Files Processed: ${summary.totalFiles}`);
    console.log(`📝 Total Words: ${summary.totalWords.toLocaleString()}`);
    console.log(`📅 Processed At: ${new Date(summary.processedAt).toLocaleString()}\n`);
    
    console.log('📋 Overall Summary:');
    console.log(`   ${summary.overallSummary}\n`);
    
    console.log('🔍 Key Findings:');
    summary.keyFindings.forEach((finding: string, i: number) => {
      console.log(`   ${i + 1}. ${finding}`);
    });
    console.log('');
    
    console.log('🏷️  Top Topics:');
    console.log(`   ${summary.topTopics.join(', ')}\n`);
    
    console.log('💡 Recommendations:');
    summary.recommendations.forEach((rec: string, i: number) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    
  } else {
    console.error('❌ Pipeline failed:', result.error);
    
    // Show which nodes succeeded/failed
    console.log('\nNode execution results:');
    result.nodeResults.forEach(nodeResult => {
      const status = nodeResult.success ? '✅' : '❌';
      console.log(`${status} ${nodeResult.nodeName}: ${nodeResult.executionTime}ms`);
      if (!nodeResult.success) {
        console.log(`   Error: ${nodeResult.error}`);
      }
    });
  }

  return result;
}

// Run the example if this file is executed directly
if (require.main === module) {
  runFileProcessingPipeline()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Example failed:', error);
      process.exit(1);
    });
}

export { runFileProcessingPipeline };