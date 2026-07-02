import { describe, it, expect } from "vitest";
import { toCsv } from "../widgets/shared/export-utils.js";

describe("toCsv", () => {
  it("joins header and rows with CRLF", () => {
    expect(toCsv(["a", "b"], [[1, 2]])).toBe("a,b\r\n1,2");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    expect(toCsv(["v"], [["a,b"]])).toBe('v\r\n"a,b"');
    expect(toCsv(["v"], [['say "hi"']])).toBe('v\r\n"say ""hi"""');
    expect(toCsv(["v"], [["line1\nline2"]])).toBe('v\r\n"line1\nline2"');
  });

  it("renders null and undefined as empty fields", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("a,b\r\n,");
  });

  it("keeps typed numbers untouched, including negatives", () => {
    expect(toCsv(["v"], [[-5], [3.14], [0]])).toBe("v\r\n-5\r\n3.14\r\n0");
  });

  it("neutralizes formula-leading strings (spreadsheet formula injection)", () => {
    expect(toCsv(["v"], [["=SUM(A1:A9)"]])).toBe("v\r\n'=SUM(A1:A9)");
    expect(toCsv(["v"], [["+1"]])).toBe("v\r\n'+1");
    expect(toCsv(["v"], [["-1"]])).toBe("v\r\n'-1");
    expect(toCsv(["v"], [["@cmd"]])).toBe("v\r\n'@cmd");
    expect(toCsv(["v"], [["\t=cmd"]])).toBe("v\r\n'\t=cmd");
  });

  it("still quotes neutralized fields that contain separators", () => {
    expect(toCsv(["v"], [["=1,2"]])).toBe("v\r\n\"'=1,2\"");
  });

  it("neutralizes formula-leading header cells too", () => {
    expect(toCsv(["=h"], [[1]])).toBe("'=h\r\n1");
  });
});
