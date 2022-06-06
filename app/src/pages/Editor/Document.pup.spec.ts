/** @jest-environment ./src/util/jest_puppeteer_electron_environment */

import { RootState } from '../../state';

jest.setTimeout(60000);

import { JSONObject } from 'puppeteer-core';
import { Document, V3DocumentItem } from '../../core/document';
import { assertSome } from '../../util';
import { addUuids } from '../../util/test_helper';

const testContent: V3DocumentItem[] = addUuids([
  { type: 'paragraph_start', speaker: 'Speaker One', language: null },
  { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
  { type: 'paragraph_break' },
  { type: 'paragraph_start', speaker: 'Speaker Two', language: null },
  { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'One', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
  { type: 'artificial_silence', length: 10 },
  { type: 'paragraph_break' },
]);

beforeAll(async () => {
  await page.waitForSelector('h1');

  const document: Document = {
    content: testContent,
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
      'source-2': {
        objectUrl: 'blob://source-2',
        fileContents: new ArrayBuffer(0),
      },
    },
    metadata: {
      display_speaker_names: true,
      display_video: true,
    },
  };

  await page.evaluate((document) => {
    window.store.dispatch(window.reducers.openDocumentFromMemory(document));
  }, document as unknown as JSONObject);
});

test('Document renders item 13', async () => {
  await page.waitForSelector('#item-12');
});

async function getState(): Promise<RootState> {
  return (await page.evaluate(() => window.store.getState())) as unknown as RootState;
}

async function moveMouseToElement(selector: string) {
  const item = await page.waitForSelector(selector);
  assertSome(item);
  const bb = await item.boundingBox();
  assertSome(bb);
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
}

test('Clicking on item 4 sets userIndex', async () => {
  await moveMouseToElement('#item-4');
  await page.mouse.down();
  await page.mouse.up();
  const state = await getState();
  expect(state.editor.present?.cursor.current).toBe('user');
  expect(state.editor.present?.cursor.userIndex).toBe(4);
});

test('Dragging from 4 to 10 sets selection', async () => {
  await moveMouseToElement('#item-4');
  await page.mouse.down();
  await moveMouseToElement('#item-10');
  await page.mouse.up();
  const state = await getState();
  expect(state.editor.present?.cursor.current).toBe('user');
  expect(state.editor.present?.cursor.userIndex).toBe(10);
  expect(state.editor.present?.selection?.startIndex).toBe(4);
  expect(state.editor.present?.selection?.length).toBe(6);
  expect(state.editor.present?.selection?.headPosition).toBe('right');
});

test('Dragging from 10 to 4 sets selection', async () => {
  await moveMouseToElement('#item-10');
  await page.mouse.down();
  await moveMouseToElement('#item-4');
  await page.mouse.up();
  const state = await getState();
  expect(state.editor.present?.cursor.current).toBe('user');
  expect(state.editor.present?.cursor.userIndex).toBe(4);
  expect(state.editor.present?.selection?.startIndex).toBe(4);
  expect(state.editor.present?.selection?.length).toBe(6);
  expect(state.editor.present?.selection?.headPosition).toBe('left');
});

test('Shift+Click from 4 to 10 sets selection', async () => {
  await moveMouseToElement('#item-4');
  await page.mouse.down();
  await page.mouse.up();

  await moveMouseToElement('#item-10');
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.up();
  await page.keyboard.up('Shift');

  const state = await getState();
  expect(state.editor.present?.cursor.current).toBe('user');
  expect(state.editor.present?.cursor.userIndex).toBe(10);
  expect(state.editor.present?.selection?.startIndex).toBe(4);
  expect(state.editor.present?.selection?.length).toBe(6);
  expect(state.editor.present?.selection?.headPosition).toBe('right');
});

test('Shift+Click from 10 to 4 sets selection', async () => {
  await moveMouseToElement('#item-10');
  await page.mouse.down();
  await page.mouse.up();

  await moveMouseToElement('#item-4');
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.up();
  await page.keyboard.up('Shift');

  const state = await getState();
  expect(state.editor.present?.cursor.current).toBe('user');
  expect(state.editor.present?.cursor.userIndex).toBe(4);
  expect(state.editor.present?.selection?.startIndex).toBe(4);
  expect(state.editor.present?.selection?.length).toBe(6);
  expect(state.editor.present?.selection?.headPosition).toBe('left');
});
