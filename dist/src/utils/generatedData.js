import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
export function loadGeneratedData(filename, fallback) {
    const candidates = [
        path.resolve(process.cwd(), "src/data/generated", filename),
        path.resolve(process.cwd(), "dist/src/data/generated", filename)
    ];
    for (const candidate of candidates) {
        if (!existsSync(candidate)) {
            continue;
        }
        try {
            const raw = readFileSync(candidate, "utf8");
            return JSON.parse(raw);
        }
        catch {
            continue;
        }
    }
    return fallback;
}
