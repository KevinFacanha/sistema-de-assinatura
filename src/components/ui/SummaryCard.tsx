import { Card } from './Card';

type SummaryItem = {
  label: string;
  value: string;
};

type SummaryCardProps = {
  title: string;
  items: SummaryItem[];
};

function isLikelyHash(value: string): boolean {
  return /^[a-f0-9]{40,}$/i.test(value);
}

export function SummaryCard({ title, items }: SummaryCardProps) {
  return (
    <Card className="space-y-4">
      <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-md bg-surface-1 px-3 py-2">
            <dt className="text-xs text-text-muted">{item.label}</dt>
            <dd
              className={
                isLikelyHash(item.value)
                  ? 'mt-1 break-all font-mono text-xs font-medium text-text-strong'
                  : 'mt-1 break-words text-sm font-medium text-text-strong'
              }
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
