interface Props {
  input: string;
  output: string;
  className?: string;
}

// Render `output` (RTL Arabic) with every letter that differs from the dotless
// `input` tinted in the accent — i.e. exactly the dots the method restored.
// Restoration is length-preserving, so a positional compare is exact; if the
// lengths ever differ we fall back to plain output.
export function DiffText({ input, output, className }: Props) {
  const aligned = input.length === output.length;
  return (
    <div dir="rtl" className={className}>
      {aligned
        ? [...output].map((ch, i) =>
            ch === input[i] ? (
              <span key={i}>{ch}</span>
            ) : (
              <span key={i} className="text-accent">{ch}</span>
            )
          )
        : output}
    </div>
  );
}

// How many letters `output` restored relative to the dotless `input`.
export function countRestored(input: string, output: string): number {
  if (input.length !== output.length) return 0;
  let n = 0;
  for (let i = 0; i < output.length; i++) {
    if (output[i] !== input[i]) n++;
  }
  return n;
}
