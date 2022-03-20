import { describe, test, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from "vitest";
import { createEffect, createRoot, onMount } from "solid-js";
import createMediaQuery, { createBreakpoints } from "../src/index";

describe("createBreakpoints", () => {
  const breakpoints = {
    sm: "640px",
    lg: "1024px",
    xl: "1280px"
  };

  const matchMediaMock = vi.fn();
  const addListenerMock = vi.fn();
  const removeListenerMock = vi.fn();
  let originalMatchMedia, matchingBreakpoints;

  function checkMatch(query: string) {
    const isMatch = matchingBreakpoints.some(breakpoint => query.includes(breakpoint));
    return isMatch;
  }

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
    matchMediaMock.mockImplementation((query: string) => {
      return {
        matches: checkMatch(query),
        query,
        addEventListener: addListenerMock,
        removeEventListener: removeListenerMock
      };
    });
  });

  beforeEach(() => {
    matchingBreakpoints = [];
    window.matchMedia = matchMediaMock;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  test("match no breakpoint by default", () => {
    createRoot(dispose => {
      const matches = createBreakpoints(breakpoints);
      expect(matches).toEqual({
        sm: false,
        lg: false,
        xl: false
      });
      dispose();
    });
  });

  test("match sm breakpoint when min-width: 640px media query matches", () => {
    createRoot(dispose => {
      matchingBreakpoints = [breakpoints.sm];
      const matches = createBreakpoints(breakpoints);
      expect(matches).toEqual({
        sm: true,
        lg: false,
        xl: false
      });
      dispose();
    });
  });

  test("match sm & lg breakpoint when min-width: 1024px media query matches", () => {
    createRoot(dispose => {
      matchingBreakpoints = [breakpoints.sm, breakpoints.lg];
      const matches = createBreakpoints(breakpoints);
      expect(matches).toEqual({
        sm: true,
        lg: true,
        xl: false
      });
      dispose();
    });
  });

  test("match fallback breakpoint when window.matchMedia is not available", () => {
    window.matchMedia = undefined;
    createRoot(dispose => {
      const matchesWithNoFallback = createBreakpoints(breakpoints);
      expect(matchesWithNoFallback).toEqual({
        sm: false,
        lg: false,
        xl: false
      });

      const matchesWithFallback = createBreakpoints(breakpoints, {
        fallbackMatch: {
          sm: true,
          lg: true,
          xl: true
        }
      });
      expect(matchesWithFallback).toEqual({
        sm: true,
        lg: true,
        xl: true
      });
      dispose();
    });
  });

  test("runs correct media query for mobile-first & desktop-first responsive modes", () => {
    createRoot(dispose => {
      createBreakpoints(breakpoints);
      expect(matchMediaMock.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "(min-width: 640px)",
          ],
          [
            "(min-width: 1024px)",
          ],
          [
            "(min-width: 1280px)",
          ],
        ]
      `);

      matchMediaMock.mockClear();

      createBreakpoints(breakpoints, {
        responsiveMode: "desktop-first"
      });
      expect(matchMediaMock.mock.calls).toMatchInlineSnapshot(`
        [
          [
            "(max-width: 640px)",
          ],
          [
            "(max-width: 1024px)",
          ],
          [
            "(max-width: 1280px)",
          ],
        ]
      `);
      dispose();
    });
  });

  test("update breakpoint when media query change event is triggered", async () => {
    const actualOutput = await new Promise(resolve => {
      createRoot(dispose => {
        const matches = createBreakpoints(breakpoints);
        const output = [];

        createEffect(() => {
          output.push({
            sm: matches.sm,
            lg: matches.lg,
            xl: matches.xl
          });

          if (output.length >= 2) {
            dispose();
            resolve(output);
          }
        });

        onMount(() => {
          const smListener = addListenerMock.mock.calls[0][1];
          const lgListener = addListenerMock.mock.calls[1][1];
          smListener({
            matches: true
          });
          lgListener({
            matches: true
          });
        });
      });
    });

    expect(actualOutput).toMatchInlineSnapshot(`
      [
        {
          "lg": false,
          "sm": false,
          "xl": false,
        },
        {
          "lg": true,
          "sm": true,
          "xl": false,
        },
      ]
    `);
    expect(removeListenerMock).toBeCalledTimes(3);
  });

  test("do not setup listeners if watchChange is false", () => {
    createRoot(dispose => {
      createBreakpoints(breakpoints, {
        watchChange: false
      });

      onMount(() => {
        expect(addListenerMock).not.toBeCalled();
        dispose();
      });
    });
    expect(removeListenerMock).not.toBeCalled();
  });

  test("do not setup listeners if window.matchMedia is not available", () => {
    window.matchMedia = undefined;
    createRoot(dispose => {
      createBreakpoints(breakpoints);

      onMount(() => {
        expect(addListenerMock).not.toBeCalled();
        dispose();
      });
    });
    expect(removeListenerMock).not.toBeCalled();
  });
});
