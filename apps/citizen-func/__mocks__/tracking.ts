import { createTracker as createTrackerReal } from "../utils/tracking";
const mockTracker = (name: number | string | symbol) =>
  new Proxy(
    {},
    {
      get: (_, k) => () =>
        // eslint-disable-next-line no-console
        console.log(`Tracing ${name.toString()}.${k.toString()}`),
    },
  );
export const createTracker: typeof createTrackerReal = () =>
  new Proxy(
    {},
    {
      get(_, key) {
        return mockTracker(key);
      },
    },
  ) as ReturnType<typeof createTrackerReal>;
