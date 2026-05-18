import { describe, it, expect } from "vitest";
import {
  isBridgeRegister, isBridgeReply, isBridgePreviewStart,
  isBridgeReplyStream, isBridgeUpdateMessage, isBridgeStreamEnd,
  isBridgeCard, isBridgeButtons,
} from "../../server/ws/protocol";

describe("protocol type guards", () => {
  it("validates BridgeRegister", () => {
    expect(isBridgeRegister({ type: "register", platform: "dashboard", capabilities: ["attachments"], metadata: { agent_id: "a", token: "t" } })).toBe(true);
    expect(isBridgeRegister({ type: "other" })).toBe(false);
    expect(isBridgeRegister(null)).toBe(false);
    expect(isBridgeRegister(undefined)).toBe(false);
  });

  it("validates BridgeReply", () => {
    expect(isBridgeReply({ type: "reply", content: "hi", reply_ctx: "ctx", session_key: "sk" })).toBe(true);
    expect(isBridgeReply({ type: "reply", content: "hi" })).toBe(false);
  });

  it("validates BridgePreviewStart", () => {
    expect(isBridgePreviewStart({ type: "preview_start", ref_id: "r1", session_key: "sk", reply_ctx: "rc", content: "" })).toBe(true);
    expect(isBridgePreviewStart({ type: "preview_start" })).toBe(false);
  });

  it("validates BridgeReplyStream", () => {
    expect(isBridgeReplyStream({ type: "reply_stream", session_key: "sk", preview_handle: "ph", content: "c" })).toBe(true);
    expect(isBridgeReplyStream({ type: "reply_stream" })).toBe(false);
  });

  it("validates BridgeUpdateMessage", () => {
    expect(isBridgeUpdateMessage({ type: "update_message", session_key: "sk", preview_handle: "ph", content: "f" })).toBe(true);
  });

  it("validates BridgeStreamEnd", () => {
    expect(isBridgeStreamEnd({ type: "stream_end", preview_handle: "ph", session_key: "sk" })).toBe(true);
    expect(isBridgeStreamEnd({ type: "stream_end" })).toBe(false);
  });

  it("validates BridgeCard", () => {
    expect(isBridgeCard({ type: "card", session_key: "sk", reply_ctx: "rc", card: { elements: [] } })).toBe(true);
    expect(isBridgeCard({ type: "card", session_key: "sk" })).toBe(false);
  });

  it("validates BridgeButtons", () => {
    expect(isBridgeButtons({ type: "buttons", session_key: "sk", reply_ctx: "rc", content: "c", buttons: [[]] })).toBe(true);
    expect(isBridgeButtons({ type: "buttons" })).toBe(false);
  });
});
