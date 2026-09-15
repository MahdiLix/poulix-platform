"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { useUser } from "@/shared/user/UserProvider";
import { SearchInput } from "@/shared/ui/SearchInput";
import {
  resolveSearchRoutes,
  type SearchRole,
  type SearchScope,
} from "@/shared/search/routes";

export function GlobalSearch({
  scope = "app",
  placeholder,
  className,
}: {
  scope?: SearchScope;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuBox, setMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const role: SearchRole = user?.role === "ADMIN" ? "ADMIN" : "USER";
  const results = useMemo(
    () =>
      resolveSearchRoutes({
        query,
        language,
        role,
        scope: scope === "admin" ? "admin" : undefined,
      }),
    [language, query, role, scope],
  );
  const showResults = open && Boolean(query.trim()) && results.length > 0;

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      const isK = event.code === "KeyK" || event.key.toLowerCase() === "k";
      if (!isK) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (isEditable && target !== inputRef.current) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
      setOpen(true);
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useLayoutEffect(() => {
    if (!showResults) {
      setMenuBox(null);
      return;
    }

    function updateBox() {
      const node = inputRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setMenuBox({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }

    updateBox();
    window.addEventListener("resize", updateBox);
    window.addEventListener("scroll", updateBox, true);
    return () => {
      window.removeEventListener("resize", updateBox);
      window.removeEventListener("scroll", updateBox, true);
    };
  }, [showResults, query, language]);

  function navigate(index = activeIndex) {
    const result = results[index] ?? results[0];
    if (!result) return;
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <SearchInput
        ref={inputRef}
        value={query}
        placeholder={
          placeholder ??
          (scope === "admin" ? t.admin.search : t.home.searchPlaceholder)
        }
        shortcut="⌘K"
        role="combobox"
        aria-expanded={showResults}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) =>
              Math.min(index + 1, Math.max(0, results.length - 1)),
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(0, index - 1));
          } else if (event.key === "Enter") {
            event.preventDefault();
            navigate();
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {showResults && menuBox
        ? createPortal(
            <div
              id="global-search-results"
              role="listbox"
              onMouseDown={(event) => event.preventDefault()}
              className="fixed z-[80] overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl"
              style={{
                top: menuBox.top,
                left: menuBox.left,
                width: menuBox.width,
              }}
            >
              {results.map((result, index) => (
                <button
                  key={result.href}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => navigate(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition ${
                    index === activeIndex
                      ? "bg-primary-soft text-primary"
                      : "text-foreground hover:bg-surface-muted"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {result.label[language]}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 rtl:-rotate-90" />
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
