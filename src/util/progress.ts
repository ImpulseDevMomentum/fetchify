import readline from "readline";

function progress(value: number, width = 30) {
    const percent = Math.min(Math.max(value, 0), 100);
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);

    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`[${bar}] ${percent}%`);
    if (percent === 100) process.stdout.write("\n");
}

export { progress };