declare class TextDecoder {
	decode(data: Uint8Array): string;
}

declare class TextEncoder {
	encode(data: string): Uint8Array;
}

export const FormulaCommands = [
    "exit", "help", "set", "del", "list", "load", "unload", "tunload",
    "reload", "save", "print", "render", "det", "verbose", "wait", "watch",
    "types", "query", "solve", "truth", "proof", "apply", "stats", "generate",
    "extract", "confhelp", "core", "downgrade", "interactive", "ls", "l", "wch",
    "w", "pr", "p", "rl", "r", "x", "h", "sl", "sv", "s", "dt", "dg", "d", "ul", 
    "tul", "v", "typ", "qr", "tr", "ap", "st", "gn", "ex", "cr", "ch", "int"
];

export const ClassMapping = {
    "Data Constructor": "/(new )/g",
};