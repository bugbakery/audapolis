import React, { ChangeEvent, useState } from 'react';
import { RootState } from '../../../state';
import { useSelector } from 'react-redux';
import { TextInput } from 'evergreen-ui';
import { V3DocumentItem, V3TextItem, UuidExtension } from '../../../core/document';

function paraToText(content: V3DocumentItem[]): string {
  return content
    .filter((x): x is V3TextItem & UuidExtension => x.type == 'text')
    .map((x) => x.text)
    .join(' ');
}
function filterContentParagraphLevel(
  content: V3DocumentItem[],
  tester: (_a0: string) => boolean
): V3DocumentItem[] {
  const filteredContent: V3DocumentItem[] = [];
  let para = [];
  for (const item of content) {
    if (item.type !== 'paragraph_end') {
      para.push(item);
    } else {
      const text = paraToText(para);
      if (tester(text)) {
        filteredContent.push(para[0]);
      }
      para = [];
    }
  }
  return filteredContent;
}

function filterContentWordLevel(
  content: V3DocumentItem[],
  tester: (_a0: string) => boolean
): V3DocumentItem[] {
  const filteredContent: V3DocumentItem[] = [];
  for (const item of content) {
    if (item.type == 'text' && tester(item.text)) {
      filteredContent.push(item);
    }
  }
  return filteredContent;
}

function getScrollToItem(
  content: V3DocumentItem[],
  {
    searchString,
    level,
  }: {
    searchString: string;
    level: 'word' | 'paragraph';
  }
): V3DocumentItem | null {
  switch (level) {
    case 'paragraph': {
      const filteredParas = filterContentParagraphLevel(content, (s: string) =>
        s.includes(searchString)
      );
      if (filteredParas.length > 0) {
        return filteredParas[0];
      }
      return null;
    }
    case 'word': {
      const filteredParas = filterContentWordLevel(content, (s: string) =>
        s.includes(searchString)
      );
      if (filteredParas.length > 0) {
        return filteredParas[0];
      }
      return null;
    }
  }
}
export function SearchOverlay(): JSX.Element {
  const popupState = useSelector((state: RootState) => state.editor.present?.showSearchOverlay);

  const [formState, setFormState] = useState<{
    searchString: string;
    level: 'word' | 'paragraph';
    caseInsensitive: boolean;
    useRegex: boolean;
  }>({ searchString: '', level: 'paragraph', caseInsensitive: false, useRegex: false });

  const matchElement = useSelector((state: RootState) =>
    getScrollToItem(state.editor.present?.document.content || [], formState)
  );

  if (matchElement) {
    console.log(matchElement);
    const firstMachtItem = document.getElementById(`item-${matchElement.uuid}`);
    const scrollContainer = document.getElementById('scroll-container');
    if (firstMachtItem && scrollContainer) {
      setTimeout(() => {
        firstMachtItem.style.backgroundColor = 'rgba(255,255,0,0.2)';
        scrollContainer.scrollTo({ top: firstMachtItem.offsetTop - 30, behavior: 'smooth' });
      });
    }
  }

  return popupState ? (
    <>
      <TextInput
        width={'100%'}
        value={formState.searchString}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          console.log(`val: "${e.target.value}"`);
          setFormState((state) => ({ ...state, searchString: e.target.value }));
        }}
      />
    </>
  ) : (
    <></>
  );
}
