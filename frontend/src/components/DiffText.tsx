interface Props {
  input: string;
  output: string;
  className?: string;
  highlight?: boolean;
}

// Render `output` (RTL Arabic) with every letter that differs from the dotless
// `input` tinted in the accent — i.e. exactly the dots the method restored.
// Restoration is length-preserving, so a positional compare is exact; if the
// lengths ever differ (or `highlight` is off) we fall back to plain output.
export function DiffText({ input, output, className, highlight = true }: Props) {
  const aligned = input.length === output.length;
  return (
    <div dir="rtl" className={className}>
      {aligned && highlight
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
