import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { useRef } from "react";
import { CopilotPanel } from "../CopilotPanel";

function Wrapper(props: { isOpen: boolean; onClose?: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  return (
    <CopilotPanel
      isOpen={props.isOpen}
      onClose={props.onClose ?? (() => {})}
      messages={[]}
      connected={true}
      wip={false}
      endRef={endRef}
      onSend={() => {}}
      title="AI 助手"
    />
  );
}

describe("CopilotPanel", () => {
  it("is hidden when isOpen is false", () => {
    render(<Wrapper isOpen={false} />);
    const panel = screen.getByLabelText("AI 助手");
    expect(panel).toBeInTheDocument();
    expect(panel.dataset.open).toBe("false");
  });

  it("renders panel when open", () => {
    render(<Wrapper isOpen={true} />);
    const panel = screen.getByLabelText("AI 助手");
    expect(panel).toBeInTheDocument();
    expect(panel.dataset.open).toBe("true");
    expect(screen.getByPlaceholderText("输入 / 查看命令...")).toBeInTheDocument();
  });

  it("calls onClose when X clicked", async () => {
    let closeCalled = 0;
    render(<Wrapper isOpen={true} onClose={() => { closeCalled++; }} />);
    const user = userEvent.setup();
    const closeButton = screen.getByLabelText("关闭 AI 助手");
    await user.click(closeButton);
    expect(closeCalled).toBe(1);
  });
});
