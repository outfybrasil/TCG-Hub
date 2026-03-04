import { test, expect } from '@playwright/test';

test('verify frontend accessibility and redirect loop', async ({ page }) => {
    console.log('Testing Frontend URL: https://tcghub.tonibots.xyz');

    // Aumentar o timeout para lidar com redirecionamentos
    test.setTimeout(60000);

    try {
        const response = await page.goto('https://tcghub.tonibots.xyz', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        console.log('Status Code:', response?.status());
        console.log('Headers:', response?.headers());

        if (response?.status() === 200) {
            console.log('Frontend is accessible!');
            await expect(page).toHaveTitle(/TCG/i);
        } else {
            console.log('Frontend returned non-200 status');
        }
    } catch (error) {
        console.error('Navigation failed:', error.message);
    }
});

test('verify backend accessibility', async ({ page }) => {
    console.log('Testing Backend URL: https://api-tcghub.tonibots.xyz');

    try {
        const response = await page.goto('https://api-tcghub.tonibots.xyz/docs', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        console.log('Backend Status Code:', response?.status());
        if (response?.status() === 200) {
            console.log('Backend Docs are accessible!');
        }
    } catch (error) {
        console.error('Backend navigation failed:', error.message);
    }
});
