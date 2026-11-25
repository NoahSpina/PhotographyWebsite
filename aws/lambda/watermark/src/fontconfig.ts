import path from "node:path";

// librsvg renders SVG <text> through fontconfig, and the Lambda runtime
// ships no fonts. This must run before sharp is loaded.
process.env.FONTCONFIG_PATH ??= path.join(__dirname, "fonts");
