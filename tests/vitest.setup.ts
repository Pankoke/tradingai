// TODO: implementieren
import type { MockedFunction } from "vitest";
import { afterEach, beforeEach, vi } from "vitest";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type TFunction = (key: string) => string;

declare global {
  // Vitest replaces these via vi.stubGlobal; declarations keep TypeScript happy.
  // eslint-disable-next-line no-var
  var fetch: FetchFn;
  // eslint-disable-next-line no-var
  var t: TFunction;
}

const defaultFetchImpl: FetchFn = async () =>
  new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });

function createFetchMock(): MockedFunction<FetchFn> {
  const mock = vi.fn<FetchFn>();
  mock.mockImplementation(defaultFetchImpl);
  return mock;
}

beforeEach(() => {
  vi.stubGlobal("fetch", createFetchMock());
  vi.stubGlobal("t", ((key: string): string => key) as TFunction);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
