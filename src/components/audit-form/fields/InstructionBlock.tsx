export function InstructionBlock({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>{text}</p>
  );
}
