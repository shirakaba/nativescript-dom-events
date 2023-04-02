/**
 * Patches packages/core/ui/gestures/gestures.android.ts to make the gesture
 * handlers emit DOMEvents instead of simply calling callbacks.
 *
 * No-ops for now, as the necessary API, `_executeCallback`, is unfortunately
 * fileprivate.
 */
export function patchGesturesObserver(): void {
  console.warn(
    'Patching GesturesObserver not possible on Android at this time.'
  );
}
