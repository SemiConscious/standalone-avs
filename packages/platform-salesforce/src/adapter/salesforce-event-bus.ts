import {
  type IEventBus,
  type PlatformEvent,
  type EventHandler,
  type EventSubscription,
} from '@avs/core';
import { type SalesforceAuthProvider } from '../auth/salesforce-auth.js';

/**
 * Salesforce event bus implementation
 * Handles both local events and Salesforce Platform Events/Streaming API
 */
export class SalesforceEventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private channelSubscriptions: Map<string, Set<EventHandler>> = new Map();

  constructor(private authProvider: SalesforceAuthProvider) {}

  subscribe<T = unknown>(eventType: string, handler: EventHandler<T>): EventSubscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    let isActive = true;

    return {
      unsubscribe: () => {
        if (isActive) {
          this.handlers.get(eventType)?.delete(handler as EventHandler);
          isActive = false;
        }
      },
      isActive: () => isActive,
    };
  }

  async publish<T = unknown>(eventType: string, payload: T): Promise<void> {
    const event: PlatformEvent<T> = {
      type: eventType,
      payload,
      timestamp: new Date(),
      source: 'local',
    };

    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const promises = Array.from(handlers).map((handler) =>
        Promise.resolve(handler(event as PlatformEvent))
      );
      await Promise.all(promises);
    }
  }

  subscribeToChannel<T = unknown>(channel: string, handler: EventHandler<T>): EventSubscription {
    // For Salesforce Platform Events, we would use the Streaming API
    // This is a placeholder implementation that stores the subscription
    // Full implementation would use jsforce streaming client

    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
      // Here we would initialize the streaming connection
      void this.initializeStreamingChannel(channel);
    }

    this.channelSubscriptions.get(channel)!.add(handler as EventHandler);

    let isActive = true;

    return {
      unsubscribe: () => {
        if (isActive) {
          this.channelSubscriptions.get(channel)?.delete(handler as EventHandler);
          // If no more handlers, close the streaming connection
          if (this.channelSubscriptions.get(channel)?.size === 0) {
            this.channelSubscriptions.delete(channel);
          }
          isActive = false;
        }
      },
      isActive: () => isActive,
    };
  }

  unsubscribeAll(eventType: string): void {
    this.handlers.delete(eventType);
    this.channelSubscriptions.delete(eventType);
  }

  hasSubscribers(eventType: string): boolean {
    const localHandlers = this.handlers.get(eventType);
    const channelHandlers = this.channelSubscriptions.get(eventType);
    return (localHandlers?.size ?? 0) > 0 || (channelHandlers?.size ?? 0) > 0;
  }

  /**
   * Initialize a streaming channel subscription using Salesforce Streaming API
   */
  private async initializeStreamingChannel(_channel: string): Promise<void> {
    // This would be implemented using jsforce streaming client
    // For now, this is a placeholder
    // The actual implementation would:
    // 1. Get the connection from authProvider
    // 2. Subscribe to the Platform Event channel
    // 3. Route incoming events to registered handlers

    if (!this.authProvider.isAuthenticated()) {
      throw new Error('Cannot subscribe to streaming channel: not authenticated');
    }

    // TODO: Implement actual streaming subscription
    // const conn = this.authProvider.getConnection();
    // conn.streaming.topic(channel).subscribe((message) => {
    //   this.dispatchChannelEvent(channel, message);
    // });
  }
}

