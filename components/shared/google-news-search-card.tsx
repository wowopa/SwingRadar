import { ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildGoogleNewsSearchUrl } from "@/lib/google-news";

interface GoogleNewsSearchCardProps {
  title?: string;
  company: string;
  ticker: string;
  description?: string;
}

export function GoogleNewsSearchCard({
  title = "관련 종목 뉴스 검색",
  company,
  ticker,
  description = "서비스 안에서 모든 뉴스를 별도로 큐레이션하기보다, 필요할 때 구글 뉴스에서 직접 흐름을 확인할 수 있도록 연결합니다."
}: GoogleNewsSearchCardProps) {
  const searchUrl = buildGoogleNewsSearchUrl({ ticker, company });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
          <p className="text-sm leading-7 text-foreground/80">{description}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {company} · {ticker}
          </p>
        </div>
        <a
          href={searchUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-primary/15"
        >
          관련 종목 뉴스 검색
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  );
}
