import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { Spinner } from "@/shared/ui/Spinner";
import NotFoundPage from "@/app/not-found";

describe("LanguageToggle", () => {
  it("shows the next language on a single circular button", () => {
    render(
      <LanguageProvider initialLanguage="en">
        <LanguageToggle />
      </LanguageProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Switch to Persian" }),
    ).toHaveTextContent("FA");
    expect(screen.queryByText("EN")).not.toBeInTheDocument();
    expect(screen.queryByText("|")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch to Persian" }));
    expect(
      screen.getByRole("button", { name: "Switch to English" }),
    ).toHaveTextContent("EN");
  });

  it("uses the server language on the first render", () => {
    render(
      <LanguageProvider initialLanguage="fa">
        <LanguageToggle />
      </LanguageProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Switch to English" }),
    ).toHaveTextContent("EN");
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
      <LanguageProvider initialLanguage="en">
        <NotFoundPage />
      </LanguageProvider>,
    );
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
});
