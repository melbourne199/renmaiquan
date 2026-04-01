/**
 * 网站自动化测试脚本 - Playwright
 * 用法: node test-playwright.js
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3002';

async function testSite() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  async function test(name, fn) {
    try {
      await fn();
      results.push(`✅ ${name}`);
    } catch(e) {
      results.push(`❌ ${name}: ${e.message}`);
    }
  }

  // 首页
  await test('首页加载', async () => {
    await page.goto(BASE_URL + '/');
    const title = await page.title();
    if (!title.includes('资源夜市')) throw new Error('标题不对: ' + title);
  });

  // 留言板
  await test('留言板存在', async () => {
    await page.waitForSelector('#indexChatBoard', { timeout: 5000 });
  });

  // 政企页
  await test('政企页加载', async () => {
    await page.goto(BASE_URL + '/gov-list.html');
    await page.waitForSelector('.game-board', { timeout: 5000 });
  });

  // 站长入驻页
  await test('站长入驻页', async () => {
    await page.goto(BASE_URL + '/station.html');
    await page.waitForSelector('.apply-form', { timeout: 5000 });
  });

  // 发布群码页
  await test('发布群码页', async () => {
    await page.goto(BASE_URL + '/publish-group.html');
  });

  // 登录页
  await test('登录页', async () => {
    await page.goto(BASE_URL + '/login.html');
  });

  await browser.close();

  console.log('\n测试结果:');
  results.forEach(r => console.log(r));
  console.log(`\n通过: ${results.filter(r => r.startsWith('✅')).length}/${results.length}`);
}

testSite().catch(console.error);
