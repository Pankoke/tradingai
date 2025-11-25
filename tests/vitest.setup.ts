// TODO: implementieren
import type { MockedFunction } from "vitest";
import { afterEach, beforeEach, vi } from "vitest";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type TFunction = (key: string) => string;

declare global {
  // Vitest replaces these via vi.stubGlobal; declarations keep TypeScript happy.
  var __TEST_FETCH__: FetchFn | undefined;
  var __TEST_T__: TFunction | undefined;
}

const defaultFetchImpl: FetchFn = async () =>
  new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });

function createFetchMock(): MockedFunction<FetchFn> {
  const mock = vi.fn(defaultFetchImpl) as MockedFunction<FetchFn>;
  return mock;
}

beforeEach(() => {
  const fetchMock = createFetchMock();
  vi.stubGlobal("__TEST_FETCH__", fetchMock);
  vi.stubGlobal("fetch", fetchMock);
  const tMock = ((key: string): string => key) as TFunction;
  vi.stubGlobal("__TEST_T__", tMock);
  vi.stubGlobal("t", tMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
