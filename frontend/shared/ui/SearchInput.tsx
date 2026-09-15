import { forwardRef, type InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/shared/cn";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  shortcut?: string;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { className, shortcut, placeholder = "Search anything...", ...props },
    ref,
  ) {
    return (
      <div className={cn("relative", className)}>
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className="h-10 w-full rounded-[10px] border border-border bg-surface py-2.5 ps-10 text-sm text-foreground transition placeholder:text-muted hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          {...props}
        />
        {shortcut ? (
          <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline-block">
            {shortcut}
          </kbd>
        ) : null}
      </div>
    );
  },
);
