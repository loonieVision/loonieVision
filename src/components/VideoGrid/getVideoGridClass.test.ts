import { describe, expect, it } from "vitest";

import { getVideoGridClass } from "./getVideoGridClass";

describe("getVideoGridClass", () => {
  it("returns single column/row for 1 viewport", () => {
    const result = getVideoGridClass(1);
    expect(result).toBe("grid-cols-1 grid-rows-1");
  });

  it("returns 2 columns and 1 row for 2 viewports", () => {
    const result = getVideoGridClass(2);
    expect(result).toBe("grid-cols-2 grid-rows-1");
  });

  it("returns 2x2 grid for 4 viewports", () => {
    const result = getVideoGridClass(4);
    expect(result).toBe("grid-cols-2 grid-rows-2");
  });
});
