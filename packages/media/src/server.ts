import { getEmptyMatchesFromBreakpoints } from "./common";
import type * as API from "./index";

const createMediaQuery: typeof API.default =
  (_query, _initialState = false, _watchChange = true) =>
  () =>
    false;

export const createBreakpoints: typeof API.createBreakpoints = (_breakpoints, options = {}) =>
  options.fallbackMatch || getEmptyMatchesFromBreakpoints(_breakpoints);

export default createMediaQuery;
