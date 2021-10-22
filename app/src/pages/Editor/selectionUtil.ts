function nodesLeftToRight(a: Node, b: Node): boolean {
  const nodeOrder = a.compareDocumentPosition(b);
  return {
    [Node.DOCUMENT_POSITION_FOLLOWING]: false,
    [Node.DOCUMENT_POSITION_PRECEDING]: true,
    [Node.DOCUMENT_POSITION_CONTAINS]: true,
    [Node.DOCUMENT_POSITION_CONTAINED_BY]: true,
  }[nodeOrder];
}

export function isSelectionLeftToRight(selection: Selection): boolean | undefined {
  if (!selection.anchorNode || !selection.focusNode) return undefined;

  return selection.anchorNode == selection.focusNode
    ? selection.focusOffset < selection.anchorOffset
    : nodesLeftToRight(selection.anchorNode, selection.focusNode);
}

export function nodeLength(node: Node) {
  return node.childNodes.length || node.textContent?.length || 0;
}

export const getChild = (element: Node, n = 0): Node =>
  element?.childNodes.item(n) ? getChild(element?.childNodes.item(n)) : element;
