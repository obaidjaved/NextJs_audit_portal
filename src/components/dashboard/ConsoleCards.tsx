import Link from "next/link";

export interface ConsoleCount {
  label: string;
  value: number;
  href: string;
}

// Five plain cards: just a name and a number, each one a link to the list behind it.
export function ConsoleCards({ cards }: { cards: ConsoleCount[] }) {
  return (
    <div className="console-cards">
      {cards.map((c) => (
        <Link key={c.label} href={c.href} className="console-card card">
          <span className="console-card-label">{c.label}</span>
          <span className="console-card-value">{c.value}</span>
        </Link>
      ))}
    </div>
  );
}
