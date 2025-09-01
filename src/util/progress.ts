import readline from "readline";

/**
 
Copyright (c) 2025 thximpulse

This software is provided for personal and commercial use AS IS, with the following conditions:

You are allowed to use this code in your own projects and run it on your servers.
You are NOT allowed to modify, alter, or create derivative works based on this code.
You are NOT allowed to remove this copyright notice or claim this code as your own.
Redistribution of modified versions is strictly forbidden.
The software is provided "AS IS", without warranty of any kind. 
The authors are not responsible for any damage, loss, or issues caused by the use of this software.
*/

function progress(value: number, width = 40, label = "") {
    const percent = Math.min(Math.max(value, 0), 100);
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
    
    if (label) {
        process.stdout.write(`${label} [${bar}] ${percent.toFixed(1)}%`);
    } else {
        process.stdout.write(`[${bar}] ${percent.toFixed(1)}%`);
    }
    
    if (percent === 100) process.stdout.write("\n");
}

function showTitle(title: string) {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60));
}

function clearLine() {
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
}

export { progress, showTitle, clearLine };