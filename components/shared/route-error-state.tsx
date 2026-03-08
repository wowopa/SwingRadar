"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RouteErrorStateProps {
  title: string;
  description: string;
  reset: () => void;
}

export function RouteErrorState({ title, description, reset }: RouteErrorStateProps) {
  return (
    <main>
      <Card className="mx-auto max-w-3xl">
        <CardHeader className="items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-caution/30 bg-caution/10 text-caution">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl text-foreground">{title}</CardTitle>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button onClick={reset} type="button">
            <RotateCcw className="h-4 w-4" />
            다시 시도
          </Button>
          <p className="text-sm text-muted-foreground">일시적인 fetch 실패 또는 서버 응답 오류일 수 있습니다.</p>
        </CardContent>
      </Card>
    </main>
  );
}
