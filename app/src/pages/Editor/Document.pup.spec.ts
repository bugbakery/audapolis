/** @jest-environment ./src/util/jest_puppeteer_electron_environment */

import { RootState } from '../../state';

jest.setTimeout(60000);

import { Document, V3DocumentItem } from '../../core/document';
import { assertSome } from '../../util';
import { addUuids } from '../../util/test_helper';

const testContent: V3DocumentItem[] = addUuids([
  { type: 'paragraph_start', speaker: 'Speaker One', language: null },
  { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
  { type: 'paragraph_end' },
  { type: 'paragraph_start', speaker: 'Speaker Two', language: null },
  { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'One', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
  { type: 'artificial_silence', length: 10 },
  { type: 'paragraph_end' },
]);

beforeEach(async () => {
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
  }, document);
});

afterEach(async () => {
  await page.evaluate(() => {
    window.store.dispatch(window.reducers.closeDocument());
  });
});

test('Document renders item 13', async () => {
  await page.waitForSelector(`#item-${testContent[12].uuid}`);
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
  await moveMouseToElement(`#item-${testContent[4].uuid}`);
  await page.mouse.down();
  await page.mouse.up();
  const state = await getState();
  expect(state.editor.present?.cursor.current).toBe('user');
  expect(state.editor.present?.cursor.userIndex).toBe(4);
});
