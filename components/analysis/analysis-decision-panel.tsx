import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnalysisDecisionPanel({ notes }: { notes: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>판단 메모</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {notes.length ? (
          notes.map((note) => (
            <div key={note} className="rounded-[28px] border border-border/70 bg-secondary/35 px-5 py-4 text-sm leading-7 text-foreground/82">
              {note}
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-border/70 bg-secondary/35 px-5 py-4 text-sm leading-7 text-muted-foreground">
            아직 추가 판단 메모가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
