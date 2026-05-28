import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterDropdown } from "../components/FilterDropdown";

const options = [
  { label: "全部", value: "" },
  { label: "在职", value: "active" },
  { label: "已归档", value: "archived" },
];

describe("FilterDropdown", () => {
  it("renders all options", () => {
    render(<FilterDropdown onChange={() => {}} options={options} value="" />);
    expect(screen.getByText("全部")).toBeInTheDocument();
    expect(screen.getByText("在职")).toBeInTheDocument();
    expect(screen.getByText("已归档")).toBeInTheDocument();
  });

  it("uses sw-filter class", () => {
    const { container } = render(<FilterDropdown onChange={() => {}} options={options} value="" />);
    expect(container.querySelector(".sw-filter")).toBeTruthy();
  });

  it("does not add active class when value is empty", () => {
    const { container } = render(<FilterDropdown onChange={() => {}} options={options} value="" />);
    expect(container.querySelector(".sw-filter--active")).toBeNull();
  });

  it("adds active class when value is non-empty", () => {
    const { container } = render(<FilterDropdown onChange={() => {}} options={options} value="active" />);
    expect(container.querySelector(".sw-filter--active")).toBeTruthy();
  });

  it("calls onChange with selected value", async () => {
    const onChange = vi.fn();
    render(<FilterDropdown onChange={onChange} options={options} value="" />);
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "active");
    expect(onChange).toHaveBeenCalledWith("active");
  });

  it("renders ChevronDown icon", () => {
    const { container } = render(<FilterDropdown onChange={() => {}} options={options} value="" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
