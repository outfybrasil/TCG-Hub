import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

async function fetchWithCurl(url: string): Promise<string> {
    const { stdout } = await execFileAsync(
        'curl',
        [
            '-L',
            '--silent',
            '--show-error',
            '--compressed',
            '--max-time',
            '20',
            '-A',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            url,
        ],
        { maxBuffer: 8 * 1024 * 1024 }
    );
    return stdout;
}

async function run() {
    const url = 'https://www.ligapokemon.com.br/?view=cards/search&card=Pikachu+ex&qual=2&enc=1';
    console.log('Fetching', url);
    const html = await fetchWithCurl(url);
    fs.writeFileSync('liga-search-page.html', html, 'utf-8');
    console.log('Saved to liga-search-page.html');
}

run();
