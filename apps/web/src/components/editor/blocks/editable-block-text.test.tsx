import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { EditableBlockText } from "./editable-block-text";

describe("EditableBlockText", () => {
  test("renders an editable value exactly once", () => {
    const marker = "UNIQUE_BLOCK_VALUE";
    const html = renderToStaticMarkup(
      <EditableBlockText
        ariaLabel="Test value"
        editable
        onChange={() => undefined}
        value={marker}
      />,
    );

    expect(html.split(marker)).toHaveLength(2);
  });
});
