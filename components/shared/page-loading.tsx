import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface PageLoadingProps {
  eyebrow: string;
  title: string;
  description: string;
  cards?: number;
}

export function PageLoading({ eyebrow, title, description, cards = 3 }: PageLoadingProps) {
  return (
    <main className="space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-28 animate-pulse rounded-full bg-secondary" />
        <div className="h-10 w-80 animate-pulse rounded-xl bg-secondary" />
        <div className="h-5 w-full max-w-3xl animate-pulse rounded-lg bg-secondary/80" />
        <div className="h-5 w-full max-w-2xl animate-pulse rounded-lg bg-secondary/60" />
      </div>
      <section className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={`${title}-${index}`}>
            <CardHeader className="gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-3 w-16 animate-pulse rounded-full bg-secondary/70" />
                  <div className="h-8 w-40 animate-pulse rounded-xl bg-secondary" />
                </div>
                <div className="h-7 w-16 animate-pulse rounded-full bg-secondary/80" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((__, metricIndex) => (
                  <div key={metricIndex} className="rounded-2xl border border-border/70 bg-background/30 p-4">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-secondary/80" />
                    <div className="mt-3 h-3 w-10 animate-pulse rounded-full bg-secondary/70" />
                    <div className="mt-2 h-4 w-16 animate-pulse rounded-full bg-secondary" />
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded-full bg-secondary/70" />
              <div className="h-4 w-full animate-pulse rounded-full bg-secondary/80" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-secondary/60" />
              <div className="h-28 animate-pulse rounded-2xl bg-secondary/50" />
            </CardContent>
          </Card>
        ))}
      </section>
      <p className="text-sm text-muted-foreground">{eyebrow} · {description}</p>
    </main>
  );
}