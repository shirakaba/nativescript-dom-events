// Make sure this .d.ts file is referenced in any project making use of DOM
// Events, as it augments the Core types to support them.
// https://github.com/microsoft/TypeScript/issues/36146#issuecomment-1190925432
declare module '@nativescript/core' {
  // import {
  //   EventData,
  //   GestureEventData,
  //   GestureTypes,
  // } from '@nativescript/core';

  type ViewBase = import('@nativescript/core/ui/core/view-base').ViewBase;
  type EventData = import('@nativescript/core/data/observable').EventData;
  // type NotifyData = import('@nativescript/core/data/observable').NotifyData;
  type GestureEventData =
    import('@nativescript/core/ui/gestures').GestureEventData;
  type GestureTypes = import('@nativescript/core/ui/gestures').GestureTypes;
  type GesturesObserver =
    import('@nativescript/core/ui/gestures').GesturesObserver;
  type DOMEvent = import('./dom-event').DOMEvent;

  // import { DOMEvent } from './dom-event';

  export interface ObserverEntry extends ListenerEntry {
    observer: GesturesObserver;
  }

  export interface ListenerEntry extends AddEventListenerOptions {
    callback: (data: EventData) => void;
    thisArg: any;
  }

  export interface PropertyChangeData extends EventData {
    /**
     * The name of the property that has changed.
     */
    propertyName: string;
    /**
     * The new value of the property.
     */
    value: any;
    /**
     * The previous value of the property.
     */
    oldValue?: any;
  }

  export class Observable implements EventTarget {
    readonly _observers: { [eventName: string]: ListenerEntry[] };

    static _indexOfListener(
      list: ListenerEntry[],
      callback: (data: EventData) => void,
      thisArg?: any,
      options?: EventListenerOptions | boolean
    ): number;

    _isViewBase: boolean;
    isViewBase(): this is ViewBase;

    _getEventList(eventName: string, createIfNeeded?: boolean): ListenerEntry[];

    // notify<T extends EventData>(data: T, options?: CustomEventInit): void;
    notify<T extends import('@nativescript/core/data/observable').NotifyData>(
      data: T
    ): void;

    dispatchEvent(event: Event): boolean;

    set(name: string, value: any): void;
    setProperty(name: string, value: any, options?: CustomEventInit): void;
    get(name: string): any;
    notifyPropertyChange(
      name: string,
      value: any,
      oldValue?: any,
      options?: CustomEventInit
    ): void;
    hasListeners(eventName: string): boolean;
    _emit(eventNames: string, options?: CustomEventInit): void;
    _createPropertyChangeData(
      propertyName: string,
      value: any,
      oldValue?: any
    ): PropertyChangeData;

    on(
      eventNames: string,
      callback:
        | EventListenerOrEventListenerObject
        | ((data: EventData) => void),
      thisArg?: any,
      options?: AddEventListenerOptions | boolean
    ): void;

    once(
      eventNames: string,
      callback:
        | EventListenerOrEventListenerObject
        | ((data: EventData) => void),
      thisArg?: any,
      options?: (AddEventListenerOptions & { once: true }) | boolean
    ): void;

    addEventListener(
      eventNames: string,
      callback:
        | EventListenerOrEventListenerObject
        | ((data: EventData) => void)
        | null,
      thisArg?: any,
      options?: AddEventListenerOptions | boolean
    ): void;

    removeEventListener(
      eventNames: string,
      callback?:
        | EventListenerOrEventListenerObject
        | ((data: EventData) => void)
        | null,
      thisArg?: any,
      options?: EventListenerOptions | boolean
    ): void;

    off(
      eventNames: string,
      callback?:
        | EventListenerOrEventListenerObject
        | ((data: EventData) => void),
      thisArg?: any,
      options?: EventListenerOptions | boolean
    ): void;
  }

  // Problem: we can't augment classes in TypeScript. We can only redeclare the
  // whole thing. For some reason, we can't extend ViewBase here, either.
  //
  // This is looking like a horrific maintenance burden. Any change to Core will
  // break this as my declarations will fall out of sync and cause typings
  // complaints.
  //
  // So it seems the only viable way would be to wrap elements in a
  // DOM-compliant class. But we still nonetheless need to override the existing
  // events implementation even to do that. So it may be that the only way
  // forward, either way we go about it, would be to use a lot of @ts-ignore...
  export abstract class ViewCommon {
    readonly _gestureObservers: { [gestureName: string]: ObserverEntry[] };

    _observe(
      type: GestureTypes,
      callback: (args: GestureEventData) => void,
      thisArg?: any,
      options?: AddEventListenerOptions | boolean
    ): void;

    getGestureObservers(type: GestureTypes): readonly ObserverEntry[];

    addEventListener(
      arg: string | GestureTypes,
      callback:
        | EventListenerOrEventListenerObject
        | ((data: EventData) => void),
      thisArg?: any,
      options?: AddEventListenerOptions | boolean
    ): void;

    removeEventListener(
      arg: string | GestureTypes,
      callback?:
        | EventListenerOrEventListenerObject
        | ((data: EventData) => void),
      thisArg?: any,
      options?: EventListenerOptions | boolean
    ): void;

    _disconnectGestureObservers(
      type: GestureTypes,
      callback?: (data: EventData) => void,
      thisArg?: any,
      options?: EventListenerOptions | boolean
    ): void;
  }
}