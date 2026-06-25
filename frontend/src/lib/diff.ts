import { isDotted } from "./arabic";

export type Seg = { ch: string; kind: "same" | "dot" | "other" };

// Skip the O(n·m) alignment for very large inputs (keeps the UI snappy).
const LIMIT = 2_000_000;

// Classify each output char vs the input: unchanged ("same"), a restored dotted
// letter ("dot"), or any other change/insertion ("other"). Uses an LCS to align
// output to input, so it works even when lengths differ. Returns null if too big.
export function classifyOutput(input: string, output: string): Seg[] | null {
  const a = [...input];
  const b = [...output];
  const n = a.length;
  const m = b.length;
  if (n * m > LIMIT) return null;

  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] =
        a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }

  const matched = new Uint8Array(m);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      matched[j] = 1;
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  const segs: Seg[] = b.map((ch, k) =>
    matched[k] ? { ch, kind: "same" } : isDotted(ch) ? { ch, kind: "dot" } : { ch, kind: "other" }
  );

  // A changed combining mark (tashkeel) is zero-width; surface it on its base
  // letter by marking that letter "other" too.
  for (let k = 1; k < segs.length; k++) {
    if (segs[k].kind === "other" && /\p{M}/u.test(segs[k].ch) && segs[k - 1].kind === "same") {
      segs[k - 1].kind = "other";
    }
  }
  return segs;
}
