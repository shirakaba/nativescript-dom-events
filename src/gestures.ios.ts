import {
  GestureEventData,
  GesturesObserver,
  Observable,
} from '@nativescript/core';

import { DOMEvent } from './dom-event';

/**
 * Patches packages/core/ui/gestures/gestures.ios.ts to make the gesture
 * handlers emit DOMEvents instead of simply calling callbacks.
 */
export function patchGesturesObserver(): void {
  GesturesObserver.prototype._executeCallback = function _executeCallback(
    args: GestureEventData
  ): void {
    if (!this.callback) {
      return;
    }

    new DOMEvent(args.eventName).dispatchTo(
      // Technically we should be able to cast Partial<View> to View to satisfy
      // this, but see the known problems in the README.
      //
      // ... And in the first place, this shouldn't be Partial<View> anyway!
      args.view as Observable,
      args
    );
  };
}
