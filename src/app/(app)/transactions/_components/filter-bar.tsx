"use client";

import { Download, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { activeFilterCount, type TransactionFilters } from "../_lib/filters";
import type { AccountOption } from "../_lib/options";
import { FiltersPanel } from "./filters-panel";

export function FilterBar({
  filters,
  onChange,
  accounts,
  onExport,
}: {
  filters: TransactionFilters;
  onChange: (patch: Partial<TransactionFilters>) => void;
  accounts: AccountOption[];
  onExport: () => void;
}) {
  const count = activeFilterCount(filters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="max-w-xs">
        <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
        <InputGroupInput placeholder="Search description or counterparty" aria-label="Search transactions" value={filters.q} onChange={(e) => onChange({ q: e.target.value })} />
      </InputGroup>

      <div className="hidden sm:block">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline"><SlidersHorizontal className="size-4" />Filters{count > 0 && <Badge className="ml-1">{count}</Badge>}</Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 max-h-[70vh] overflow-y-auto">
            <FiltersPanel filters={filters} onChange={onChange} accounts={accounts} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="sm:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline"><SlidersHorizontal className="size-4" />Filters{count > 0 && <Badge className="ml-1">{count}</Badge>}</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
            <div className="px-4 pb-6"><FiltersPanel filters={filters} onChange={onChange} accounts={accounts} /></div>
          </SheetContent>
        </Sheet>
      </div>

      <Button variant="outline" className="ml-auto" onClick={onExport}>
        <Download className="size-4" />Export CSV
      </Button>
    </div>
  );
}
