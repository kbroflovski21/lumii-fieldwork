import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserRound, Search, X } from "lucide-react";
import { EmptyState } from "../components/EmptyState";

describe("EmptyState", () => {
  it("renders with description only", () => {
    render(<EmptyState icon={UserRound} description="加载中..." />);
    expect(screen.getByText("加载中...")).toBeInTheDocument();
  });

  it("renders with title and description", () => {
    render(<EmptyState icon={UserRound} title="暂无数据" description="点击新增创建记录" />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
    expect(screen.getByText("点击新增创建记录")).toBeInTheDocument();
  });

  it("renders action slot", () => {
    render(<EmptyState icon={UserRound} title="暂无数据" action={<button>新增</button>} />);
    expect(screen.getByText("新增")).toBeInTheDocument();
  });

  it("uses sw-empty class structure", () => {
    const { container } = render(<EmptyState icon={UserRound} description="test" />);
    expect(container.querySelector(".sw-empty")).toBeTruthy();
    expect(container.querySelector(".sw-empty__icon")).toBeTruthy();
  });

  it("adds error class when isError is true", () => {
    const { container } = render(<EmptyState icon={X} description="出错了" isError />);
    expect(container.querySelector(".sw-empty__icon--error")).toBeTruthy();
  });

  it("does not add error class when isError is false", () => {
    const { container } = render(<EmptyState icon={UserRound} description="test" />);
    expect(container.querySelector(".sw-empty__icon--error")).toBeNull();
  });

  it("renders icon", () => {
    const { container } = render(<EmptyState icon={Search} description="无匹配" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
