/** @jest-environment ./src/util/jest_puppeteer_electron_environment */
jest.setTimeout(60000);

test('App starts and has heading', async () => {
  await page.waitForSelector('h1');
});
