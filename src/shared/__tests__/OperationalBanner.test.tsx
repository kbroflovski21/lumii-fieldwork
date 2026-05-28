import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperationalBanner } from "../components/OperationalBanner";

describe("OperationalBanner", () => {
  it("returns null for normal state", () => {
    const { container } = render(<OperationalBanner state={{ permission: "full" }} resourceLabel="服务人员" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders unavailable banner with resource label", () => {
    render(<OperationalBanner state={{ unavailableMessage: "系统维护中" }} resourceLabel="设备" />);
    expect(screen.getByText("设备暂不可用")).toBeInTheDocument();
    expect(screen.getByText("系统维护中")).toBeInTheDocument();
  });

  it("renders unavailable banner with danger style", () => {
    const { container } = render(<OperationalBanner state={{ unavailableMessage: "error" }} resourceLabel="X" />);
    expect(container.querySelector(".sw-banner--danger")).toBeTruthy();
  });

  it("renders read-only banner with default hint", () => {
    render(<OperationalBanner state={{ permission: "read_only" }} resourceLabel="长者" />);
    expect(screen.getByText("只读模式")).toBeInTheDocument();
    expect(screen.getByText("可查看数据，新增、编辑等操作已禁用。")).toBeInTheDocument();
  });

  it("renders read-only banner with custom hint", () => {
    render(<OperationalBanner state={{ permission: "read_only" }} resourceLabel="排期" readOnlyHint="可查看数据，调整和取消操作已禁用。" />);
    expect(screen.getByText("可查看数据，调整和取消操作已禁用。")).toBeInTheDocument();
  });

  it("renders restricted banner with default hint", () => {
    render(<OperationalBanner state={{ permission: "restricted" }} resourceLabel="记录" />);
    expect(screen.getByText("权限受限")).toBeInTheDocument();
    expect(screen.getByText("敏感信息已隐藏，部分操作不可用。")).toBeInTheDocument();
  });

  it("renders restricted banner with custom hint", () => {
    render(<OperationalBanner state={{ permission: "restricted" }} resourceLabel="记录" restrictedHint="原始音频不可播放，敏感信息已隐藏。" />);
    expect(screen.getByText("原始音频不可播放，敏感信息已隐藏。")).toBeInTheDocument();
  });

  it("has role=status", () => {
    const { container } = render(<OperationalBanner state={{ unavailableMessage: "err" }} resourceLabel="X" />);
    expect(container.querySelector("[role='status']")).toBeTruthy();
  });

  it("prioritizes unavailable over read_only", () => {
    render(<OperationalBanner state={{ unavailableMessage: "down", permission: "read_only" }} resourceLabel="X" />);
    expect(screen.getByText("X暂不可用")).toBeInTheDocument();
    expect(screen.queryByText("只读模式")).toBeNull();
  });
});
