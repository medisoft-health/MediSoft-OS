/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Mic } from "lucide-react";
import * as React from "react";
import { EmptyState, ErrorState } from "@/components/ui/states";

/**
 * These tests use react-dom/server.renderToStaticMarkup — no full DOM
 * setup needed. We assert structural details (text + role) rather than
 * doing pixel-level visual checks.
 */

describe("EmptyState", () => {
  it("renders title + description", () => {
    const out = renderToStaticMarkup(
      React.createElement(EmptyState, {
        icon: Mic,
        title: "Nothing here",
        description: "Add the first item to get started.",
      }),
    );
    expect(out).toContain("Nothing here");
    expect(out).toContain("Add the first item to get started.");
    expect(out).toContain('role="status"');
  });

  it("renders an action when provided", () => {
    const out = renderToStaticMarkup(
      React.createElement(EmptyState, {
        icon: Mic,
        title: "Empty",
        action: { label: "Create one", href: "/create" },
      }),
    );
    expect(out).toContain("Create one");
    expect(out).toContain('href="/create"');
  });

  it("renders without a card wrapper when card={false}", () => {
    const withCard = renderToStaticMarkup(
      React.createElement(EmptyState, {
        icon: Mic,
        title: "X",
        card: true,
      }),
    );
    const withoutCard = renderToStaticMarkup(
      React.createElement(EmptyState, {
        icon: Mic,
        title: "X",
        card: false,
      }),
    );
    // The card variant has more wrapping markup.
    expect(withCard.length).toBeGreaterThan(withoutCard.length);
    // Both contain the role + title.
    expect(withCard).toContain('role="status"');
    expect(withoutCard).toContain('role="status"');
  });
});

describe("ErrorState", () => {
  it("uses the destructive tone background by default", () => {
    const out = renderToStaticMarkup(
      React.createElement(ErrorState, {
        icon: Mic,
        title: "Something broke",
      }),
    );
    expect(out).toContain("Something broke");
    // The destructive tone references the destructive token.
    expect(out).toContain("color-destructive");
  });

  it("renders both primary and secondary actions", () => {
    const out = renderToStaticMarkup(
      React.createElement(ErrorState, {
        icon: Mic,
        title: "Failed",
        action: { label: "Retry" },
        secondaryAction: { label: "Back home", href: "/" },
      }),
    );
    expect(out).toContain("Retry");
    expect(out).toContain("Back home");
  });
});
