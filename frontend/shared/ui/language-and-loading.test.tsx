import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { Spinner } from "@/shared/ui/Spinner";
import NotFoundPage from "@/app/not-found";

describe("LanguageToggle", () => {
  it("renders separate EN and FA buttons without a pipe separator", () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>,
    );
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FA" })).toBeInTheDocument();
    expect(screen.queryByText("|")).not.toBeInTheDocument();
  });
});

describe("Spinner", () => {
  it("exposes a loading status", () => {
    render(<Spinner label="Loading..." />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

describe("404 page", () => {
  it("renders the custom not found page", () => {
    render(
      <LanguageProvider>
        <NotFoundPage />
      </LanguageProvider>,
    );
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
});
