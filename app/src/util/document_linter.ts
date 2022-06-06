import { V3DocumentItem } from '../core/document';
import { isParagraphItem } from '../state/editor/selectors';

export function lintDocumentContent(content: V3DocumentItem[]): {
  pass: boolean;
  message: () => string;
} {
  /**
   * Verifies that `received` is accepted by the following automaton:
   *
   *                       paragraph_items
   *                      ┌────────────┐
   *                      │            │
   *                      │            ▼
   *   paragraph_start ┌──┴────────────────┐
   *       ┌──────────►│ In Paragraph      │
   *       │           └┬──────────────────┘
   *   ┌───┴───┐        │paragraph_break ▲
   *   │ Start │        ▼                │ paragraph_start
   *   └───────┘       ┌─────────────────┴─┐             ┌─────────┐
   *       ▲           │ Outside Paragraph ├────────────►│ Accept  │
   *       │           └───────────────────┘    EOF      └─────────┘
   */
  if (content.length == 0) {
    return {
      pass: false,
      message: () => 'every document needs to have at least one item',
    };
  }
  if (content[0].type != 'paragraph_start') {
    return { pass: false, message: () => 'every document needs to start with a paragraph_start' };
  }
  if (content[content.length - 1].type != 'paragraph_break') {
    return { pass: false, message: () => 'every document needs to end with a paragraph_break' };
  }
  let inPara = false;
  for (const item of content) {
    if (isParagraphItem(item) && !inPara) {
      return { pass: false, message: () => 'paragraph item encountered outside of paragraph' };
    }
    if (item.type == 'paragraph_start') {
      if (inPara) {
        return { pass: false, message: () => 'paragraph_start item encountered in paragraph' };
      } else {
        inPara = true;
      }
    }
    if (item.type == 'paragraph_break') {
      if (!inPara) {
        return {
          pass: false,
          message: () => 'paragraph_break item encountered outside of paragraph',
        };
      } else {
        inPara = false;
      }
    }
  }
  return { pass: true, message: () => ':)' };
}
