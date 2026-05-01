export type RevealSubscription = (listener: () => void) => void;

/**
 * Fire a reveal callback once, using whichever renderer/window readiness
 * signal arrives first.
 */
export function bindFirstRevealTrigger(
  subscribers: readonly RevealSubscription[],
  reveal: () => void,
): void {
  let revealed = false;
  const fire = () => {
    if (revealed) return;
    revealed = true;
    reveal();
  };

  for (const subscribe of subscribers) {
    subscribe(fire);
  }
}
