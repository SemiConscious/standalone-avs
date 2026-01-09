/**
 * AI Insight domain types
 * Platform-agnostic - no Salesforce or other platform knowledge
 */

// =============================================================================
// Insight Types
// =============================================================================

export type InsightType = 'call_summary' | 'sentiment' | 'action_item' | 'topic' | 'coaching';

export type SentimentScore = 'positive' | 'neutral' | 'negative';

// =============================================================================
// Insight Entity
// =============================================================================

/**
 * AI Insight entity - represents an AI-generated insight from a call
 */
export interface Insight {
  /** Unique identifier */
  id: string;
  /** Related call log ID */
  callLogId: string;
  /** Insight type */
  type: InsightType;
  /** Insight title/summary */
  title: string;
  /** Detailed insight content */
  content: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Creation date */
  createdDate: string;
  /** Related user ID (agent) */
  agentId?: string;
  /** Related user name (agent) */
  agentName?: string;
}

// =============================================================================
// Call Analysis Types
// =============================================================================

/**
 * Full call analysis with transcript and insights
 */
export interface CallAnalysis {
  /** Call log ID */
  callLogId: string;
  /** Full transcript */
  transcript: TranscriptSegment[];
  /** Overall sentiment */
  sentiment: SentimentScore;
  /** Sentiment score (-1 to 1) */
  sentimentScore: number;
  /** Summary of the call */
  summary: string;
  /** Action items identified */
  actionItems: ActionItem[];
  /** Topics discussed */
  topics: Topic[];
  /** Coaching suggestions (if applicable) */
  coachingSuggestions?: CoachingSuggestion[];
}

/**
 * Transcript segment
 */
export interface TranscriptSegment {
  /** Speaker identifier */
  speaker: 'agent' | 'customer';
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Transcribed text */
  text: string;
  /** Segment sentiment */
  sentiment?: SentimentScore;
}

/**
 * Action item from call
 */
export interface ActionItem {
  /** Action description */
  description: string;
  /** Who should take the action */
  assignee?: string;
  /** Due date if mentioned */
  dueDate?: string;
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
}

/**
 * Topic discussed in call
 */
export interface Topic {
  /** Topic name */
  name: string;
  /** Relevance score (0-1) */
  relevance: number;
  /** Times this topic was mentioned */
  mentions: number;
}

/**
 * Coaching suggestion for agent
 */
export interface CoachingSuggestion {
  /** Suggestion category */
  category: string;
  /** Suggestion text */
  suggestion: string;
  /** Relevant transcript segment */
  context?: string;
}

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Filters for insight/transcript search
 */
export interface InsightFilters {
  /** Start date */
  fromDate?: string;
  /** End date */
  toDate?: string;
  /** Agent/user ID */
  agentId?: string;
  /** Search term for transcript text */
  searchTerm?: string;
  /** Filter by sentiment */
  sentiment?: SentimentScore;
  /** Filter by insight type */
  insightType?: InsightType;
  /** Minimum confidence score */
  minConfidence?: number;
}

// =============================================================================
// Statistics Types
// =============================================================================

/**
 * AI Advisor statistics
 */
export interface InsightStats {
  /** Total calls analyzed */
  totalCallsAnalyzed: number;
  /** Average sentiment score */
  averageSentiment: number;
  /** Distribution by sentiment */
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  /** Most common topics */
  topTopics: Array<{ name: string; count: number }>;
  /** Average action items per call */
  averageActionItems: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get sentiment label for display
 */
export function getSentimentLabel(sentiment: SentimentScore): string {
  switch (sentiment) {
    case 'positive':
      return 'Positive';
    case 'neutral':
      return 'Neutral';
    case 'negative':
      return 'Negative';
  }
}

/**
 * Get sentiment color class
 */
export function getSentimentColor(sentiment: SentimentScore): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-600';
    case 'neutral':
      return 'text-gray-600';
    case 'negative':
      return 'text-red-600';
  }
}

/**
 * Convert sentiment score (-1 to 1) to sentiment type
 */
export function scoreTosenteriment(score: number): SentimentScore {
  if (score > 0.2) return 'positive';
  if (score < -0.2) return 'negative';
  return 'neutral';
}
