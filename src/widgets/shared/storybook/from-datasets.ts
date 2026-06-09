import type { Dataset } from "../../sandbox/datasets/types.js";

// `noUncheckedIndexedAccess` is on — a missing id is a real possibility the
// compiler forces us to handle. Throw loudly at story-load time rather than
// rendering `undefined`. This is the sanctioned path: story files must not
// index the dataset array directly or use non-null assertions.
export function payloadById<P>(datasets: Dataset<P>[], id: string): P {
  const found = datasets.find((d) => d.id === id);
  if (!found) {
    throw new Error(`Storybook: dataset id "${id}" not found in catalog`);
  }
  return found.payload;
}
