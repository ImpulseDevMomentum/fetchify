import readline from "readline";

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