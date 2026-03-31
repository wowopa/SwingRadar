import { LoaderCircle } from "lucide-react";

interface PageLoadingProps {
  eyebrow: string;
  title: string;
  description: string;
  cards?: number;
}

export function PageLoading({ eyebrow, title, description }: PageLoadingProps) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <div className="sr-only">
          {eyebrow} {title} {description}
        </div>
      </div>
    </main>
  );
}
