import {test as base, expect} from '@playwright/test';
export const test = base.extend<{browserDiagnostics: void}>({
  browserDiagnostics: [async ({page}, use, testInfo) => {
    const pageErrors: string[] = []; const consoleErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await use();
    await testInfo.attach('browser-diagnostics', {
      body: JSON.stringify({pageErrors, consoleErrorCount:consoleErrors.length,consoleErrors},null,2), contentType:'application/json',
    });
    console.log(`${testInfo.title}: ${pageErrors.length} uncaught page errors; ${consoleErrors.length} console errors (intentional failed HTTP requests).`);
    expect(pageErrors).toEqual([]);
  }, {auto:true}],
});
export {expect};
