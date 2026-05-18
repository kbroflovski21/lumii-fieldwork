import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";

describe("App production routes", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("lazy-loads the legacy Redpei mock route outside the production page bundle", async () => {
    window.history.pushState({}, "", "/site-operations-redpei-mock");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Lumii 站点运营助手" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "页面不存在" })).not.toBeInTheDocument();
  });
});
