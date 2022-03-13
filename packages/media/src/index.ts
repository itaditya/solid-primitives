import { createEffect, createMemo, createSignal, getOwner, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { isServer } from "solid-js/web";
import { entries, getEmptyMatchesFromBreakpoints } from "./common";
import { Breakpoints, BreakpointOptions, MqlInstances, Matches } from "./types";

/**
 * Creates a very simple and straightforward media query monitor.
 *
 * @param query Media query to listen for
 * @param fallbackState Sets the initial state to begin with
 * @param watchChange If true watches changes and reports state reactively
 * @returns Boolean value if media query is met or not
 *
 * @example
 * ```ts
 * const isSmall = createMediaQuery("(max-width: 767px)");
 * console.log(isSmall());
 * ```
 */
const createMediaQuery = (
  query: string,
  fallbackState: boolean = false,
  watchChange: boolean = true
): (() => boolean) => {
  let initialState = fallbackState;
  if (!isServer) {
    const mql = window.matchMedia(query);
    initialState = mql.matches;
    if (watchChange) {
      const onChange = () => setState(mql.matches);
      mql.addEventListener("change", onChange);
      if (getOwner()) {
        onCleanup(() => mql.removeEventListener("change", onChange));
      }
    }
  }
  const [state, setState] = createSignal(initialState);
  return state;
};

function checkMqSupported() {
  if (isServer) {
    return false;
  }

  if (!window.matchMedia) {
    return false;
  }

  return true;
}

/**
 * Creates a multi-breakpoint monitor to make responsive components easily.
 * 
 * @param breakpoints Map of breakpoint names and their widths
 * @param options Options to customize watch, fallback, responsive mode.
 * @returns map of currently matching breakpoints.
 * 
 * @example
 * ```ts
 * const breakpoints = {
    sm: "640px",
    lg: "1024px",
    xl: "1280px",
  };
 * const matches = createBreakpoints(breakpoints);
 * console.log(matches.lg);
 * ```
 */
function createBreakpoints<T extends Breakpoints>(
  breakpoints: T,
  options: BreakpointOptions<T> = {}
): Matches<T> {
  const isMqSupported = checkMqSupported();

  const mqlInstances = createMemo(() => {
    const mqlInstances = {} as MqlInstances<T>;

    if (isMqSupported) {
      entries(breakpoints).forEach(([token, width]) => {
        const responsiveProperty = options.responsiveMode === "desktop-first" ? "max" : "min";
        const mediaquery = `(${responsiveProperty}-width: ${width})`;
        const instance = window.matchMedia(mediaquery);

        mqlInstances[token] = instance;
      });
    }

    return mqlInstances;
  });

  function getInitialMatches(): Matches<T> {
    if (!isMqSupported) {
      return options.fallbackMatch || getEmptyMatchesFromBreakpoints(breakpoints);
    }

    const matches = {} as Record<keyof T, boolean>;

    entries(mqlInstances()).forEach(([token, mql]) => {
      matches[token] = mql.matches;
    });

    return matches;
  }

  // TODO: switch to createStaticStore once available to clear types
  const [matches, setMatches] = createStore<Record<keyof T, boolean>>(
    getInitialMatches()
  ) as unknown as [Matches<T>, (token: keyof T, match: boolean) => void];

  createEffect(() => {
    const shouldWatch = options.watchChange ?? true;
    if (!shouldWatch || !isMqSupported) {
      return;
    }

    entries(mqlInstances()).forEach(([token, mql]) => {
      const listener = (event: MediaQueryListEvent) => {
        setMatches(token, event.matches);
      };
      mql.addEventListener("change", listener);

      onCleanup(() => {
        mql.removeEventListener("change", listener);
      });
    });
  });

  return matches;
}

export default createMediaQuery;
export { createBreakpoints };
export * from "./types";
