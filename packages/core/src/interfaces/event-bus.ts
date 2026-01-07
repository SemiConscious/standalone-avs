/**
 * Event payload structure
 */
export interface PlatformEvent<T = unknown> {
  /** Event type/name */
  type: string;
  /** Event payload */
  payload: T;
  /** Timestamp when event occurred */
  timestamp: Date;
  /** Source of the event */
  source?: string;
  /** Correlation ID for tracking */
  correlationId?: string;
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: PlatformEvent<T>) => void | Promise<void>;

/**
 * Subscription handle for unsubscribing
 */
export interface EventSubscription {
  /** Unsubscribe from the event */
  unsubscribe(): void;
  /** Check if subscription is active */
  isActive(): boolean;
}

/**
 * Event bus interface - abstraction for platform events
 */
export interface IEventBus {
  /**
   * Subscribe to an event type
   */
  subscribe<T = unknown>(eventType: string, handler: EventHandler<T>): EventSubscription;

  /**
   * Publish an event
   */
  publish<T = unknown>(eventType: string, payload: T): Promise<void>;

  /**
   * Subscribe to platform-specific streaming events (e.g., Salesforce Platform Events)
   */
  subscribeToChannel<T = unknown>(channel: string, handler: EventHandler<T>): EventSubscription;

  /**
   * Unsubscribe all handlers for an event type
   */
  unsubscribeAll(eventType: string): void;

  /**
   * Check if there are any subscribers for an event type
   */
  hasSubscribers(eventType: string): boolean;
}

