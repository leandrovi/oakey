import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Page } from "../_lib/filters";

export function PaginationBar<T>({ page, onPageChange }: { page: Page<T>; onPageChange: (page: number) => void }) {
  if (page.total === 0) return null;
  const start = (page.page - 1) * page.pageSize + 1;
  const end = Math.min(page.page * page.pageSize, page.total);
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-xs text-muted-foreground">
        {start}–{end} of {page.total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page.page <= 1} onClick={() => onPageChange(page.page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground">Page {page.page} of {page.totalPages}</span>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page.page >= page.totalPages} onClick={() => onPageChange(page.page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
