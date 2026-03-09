/**
 * Awareness Engine — Public API
 */

export { AwarenessService } from './service.ts';
export { OCREngine } from './ocr-engine.ts';
export { ContextTracker } from './context-tracker.ts';
export { AwarenessIntelligence } from './intelligence.ts';
export { SuggestionEngine } from './suggestion-engine.ts';
export { ContextGraph } from './context-graph.ts';
export { BehaviorAnalytics } from './analytics.ts';

export type {
  CaptureFrame,
  OCRResult,
  ScreenContext,
  AwarenessEvent,
  AwarenessEventType,
  SuggestionType,
  Suggestion,
  SessionSummary,
  AppUsageStat,
  DailyReport,
  LiveContext,
} from './types.ts';
