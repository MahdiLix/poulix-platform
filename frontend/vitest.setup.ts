import { createElement } from "react";
import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) =>
    createElement("img", { alt: props.alt ?? "" }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => createElement("a", { href }, children),
}));
