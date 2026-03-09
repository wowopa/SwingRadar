export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-6 py-16">
      <div className="rounded-[32px] border border-border/70 bg-background/90 px-8 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground">NOT FOUND</p>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">페이지를 찾을 수 없습니다.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          주소가 바뀌었거나 더 이상 제공되지 않는 화면입니다.
        </p>
      </div>
    </main>
  );
}
