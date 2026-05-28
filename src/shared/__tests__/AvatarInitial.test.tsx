import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvatarInitial, avatarColor } from "../components/AvatarInitial";

describe("avatarColor", () => {
  it("returns an object with bg and text properties", () => {
    const result = avatarColor("张三");
    expect(result).toHaveProperty("bg");
    expect(result).toHaveProperty("text");
  });

  it("returns consistent color for the same name", () => {
    expect(avatarColor("张三")).toEqual(avatarColor("张三"));
  });

  it("returns a color from the 6-color palette", () => {
    const palette = ["#EEF2FF", "#F0FDF4", "#FFF7ED", "#FDF2F8", "#ECFEFF", "#F5F3FF"];
    const result = avatarColor("李明");
    expect(palette).toContain(result.bg);
  });
});

describe("AvatarInitial", () => {
  it("renders first character of name", () => {
    render(<AvatarInitial name="张三" />);
    expect(screen.getByText("张")).toBeInTheDocument();
  });

  it("applies sw-avatar class", () => {
    const { container } = render(<AvatarInitial name="李明" />);
    expect(container.querySelector(".sw-avatar")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<AvatarInitial name="王五" className="my-class" />);
    expect(container.querySelector(".sw-avatar.my-class")).toBeTruthy();
  });

  it("renders medium (36px) by default", () => {
    const { container } = render(<AvatarInitial name="赵六" />);
    const el = container.querySelector(".sw-avatar") as HTMLElement;
    expect(el.style.width).toBe("36px");
    expect(el.style.height).toBe("36px");
  });

  it("renders small (28px) with size=sm", () => {
    const { container } = render(<AvatarInitial name="赵六" size="sm" />);
    const el = container.querySelector(".sw-avatar") as HTMLElement;
    expect(el.style.width).toBe("28px");
    expect(el.style.height).toBe("28px");
  });

  it("renders large (48px) with size=lg", () => {
    const { container } = render(<AvatarInitial name="赵六" size="lg" />);
    const el = container.querySelector(".sw-avatar") as HTMLElement;
    expect(el.style.width).toBe("48px");
    expect(el.style.height).toBe("48px");
  });

  it("sets background and text color from avatarColor", () => {
    const { container } = render(<AvatarInitial name="张三" />);
    const el = container.querySelector(".sw-avatar") as HTMLElement;
    const color = avatarColor("张三");
    // jsdom normalises hex to rgb(), so convert the expected hex values before comparing
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgb(${r}, ${g}, ${b})`;
    };
    expect(el.style.background).toBe(hexToRgb(color.bg));
    expect(el.style.color).toBe(hexToRgb(color.text));
  });
});
