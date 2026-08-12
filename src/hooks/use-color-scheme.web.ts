import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribeToNothing = () => () => {};
const getHasHydrated = () => true;
const getHasHydratedOnServer = () => false;

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 *
 * `useSyncExternalStore` gives us the hydration flag without a setState-in-effect: the server
 * snapshot is `false` and the client snapshot is `true`, so React flips the value during
 * hydration instead of triggering a cascading render.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribeToNothing,
    getHasHydrated,
    getHasHydratedOnServer,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
