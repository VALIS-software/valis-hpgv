"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Terminal = void 0;
const util = require("util");
const process = require("process");
class Terminal {
    static log(...args) {
        this.write(format('<b><gray>><//> ' + util.format.apply(this, args)) + '\n');
    }
    static error(...args) {
        this.write(format('<b><red>> Error:</b> ' + util.format.apply(this, arguments)) + '\n');
    }
    static warn(...args) {
        this.write(format('<b><yellow>> Warning:</b> ' + util.format.apply(this, arguments)) + '\n');
    }
    static success(...args) {
        this.write(format('<light_green><b>></b> ' + util.format.apply(this, arguments)) + '\n');
    }
    static rewriteLine(id, str) {
        if (this.currentRewriteId === id && id !== undefined) {
            this.clearLine();
        }
        process.stdout.write(str);
        this.currentRewriteId = id;
    }
    static rewriteLineFormatted(id, str) {
        this.rewriteLine(id, format(str));
    }
    static format(str) {
        return format(str);
    }
    static writeLine(str) {
        return this.write(str + '\n');
    }
    static writeLineFormatted(str) {
        return this.writeFormatted(str + '\n');
    }
    static write(str) {
        if (this.currentRewriteId !== undefined) {
            process.stdout.write('\n');
            this.currentRewriteId = undefined;
        }
        process.stdout.write(str);
    }
    static writeFormatted(str) {
        if (this.currentRewriteId !== undefined) {
            process.stdout.write('\n');
            this.currentRewriteId = undefined;
        }
        Terminal.write(format(str));
    }
    static clearLine(resetCursor = true) {
        // erase line content and reset the cursor to start of the line
        process.stdout.write('\x1B[2K');
        if (resetCursor) {
            process.stdout.write('\r');
        }
    }
}
exports.Terminal = Terminal;
Terminal.currentRewriteId = undefined;
exports.default = Terminal;
var FormatFlag;
(function (FormatFlag) {
    FormatFlag[FormatFlag["RESET"] = 0] = "RESET";
    FormatFlag[FormatFlag["BOLD"] = 1] = "BOLD";
    FormatFlag[FormatFlag["ITALIC"] = 2] = "ITALIC";
    FormatFlag[FormatFlag["DIM"] = 3] = "DIM";
    FormatFlag[FormatFlag["UNDERLINE"] = 4] = "UNDERLINE";
    FormatFlag[FormatFlag["BLINK"] = 5] = "BLINK";
    FormatFlag[FormatFlag["INVERT"] = 6] = "INVERT";
    FormatFlag[FormatFlag["HIDDEN"] = 7] = "HIDDEN";
    FormatFlag[FormatFlag["BLACK"] = 8] = "BLACK";
    FormatFlag[FormatFlag["RED"] = 9] = "RED";
    FormatFlag[FormatFlag["GREEN"] = 10] = "GREEN";
    FormatFlag[FormatFlag["YELLOW"] = 11] = "YELLOW";
    FormatFlag[FormatFlag["BLUE"] = 12] = "BLUE";
    FormatFlag[FormatFlag["MAGENTA"] = 13] = "MAGENTA";
    FormatFlag[FormatFlag["CYAN"] = 14] = "CYAN";
    FormatFlag[FormatFlag["WHITE"] = 15] = "WHITE";
    FormatFlag[FormatFlag["LIGHT_BLACK"] = 16] = "LIGHT_BLACK";
    FormatFlag[FormatFlag["LIGHT_RED"] = 17] = "LIGHT_RED";
    FormatFlag[FormatFlag["LIGHT_GREEN"] = 18] = "LIGHT_GREEN";
    FormatFlag[FormatFlag["LIGHT_YELLOW"] = 19] = "LIGHT_YELLOW";
    FormatFlag[FormatFlag["LIGHT_BLUE"] = 20] = "LIGHT_BLUE";
    FormatFlag[FormatFlag["LIGHT_MAGENTA"] = 21] = "LIGHT_MAGENTA";
    FormatFlag[FormatFlag["LIGHT_CYAN"] = 22] = "LIGHT_CYAN";
    FormatFlag[FormatFlag["LIGHT_WHITE"] = 23] = "LIGHT_WHITE";
    FormatFlag[FormatFlag["BG_BLACK"] = 24] = "BG_BLACK";
    FormatFlag[FormatFlag["BG_RED"] = 25] = "BG_RED";
    FormatFlag[FormatFlag["BG_GREEN"] = 26] = "BG_GREEN";
    FormatFlag[FormatFlag["BG_YELLOW"] = 27] = "BG_YELLOW";
    FormatFlag[FormatFlag["BG_BLUE"] = 28] = "BG_BLUE";
    FormatFlag[FormatFlag["BG_MAGENTA"] = 29] = "BG_MAGENTA";
    FormatFlag[FormatFlag["BG_CYAN"] = 30] = "BG_CYAN";
    FormatFlag[FormatFlag["BG_WHITE"] = 31] = "BG_WHITE";
    FormatFlag[FormatFlag["BG_LIGHT_BLACK"] = 32] = "BG_LIGHT_BLACK";
    FormatFlag[FormatFlag["BG_LIGHT_RED"] = 33] = "BG_LIGHT_RED";
    FormatFlag[FormatFlag["BG_LIGHT_GREEN"] = 34] = "BG_LIGHT_GREEN";
    FormatFlag[FormatFlag["BG_LIGHT_YELLOW"] = 35] = "BG_LIGHT_YELLOW";
    FormatFlag[FormatFlag["BG_LIGHT_BLUE"] = 36] = "BG_LIGHT_BLUE";
    FormatFlag[FormatFlag["BG_LIGHT_MAGENTA"] = 37] = "BG_LIGHT_MAGENTA";
    FormatFlag[FormatFlag["BG_LIGHT_CYAN"] = 38] = "BG_LIGHT_CYAN";
    FormatFlag[FormatFlag["BG_LIGHT_WHITE"] = 39] = "BG_LIGHT_WHITE";
})(FormatFlag || (FormatFlag = {}));
const ASCII_BLACK_CODE = 0;
const ASCII_RED_CODE = 1;
const ASCII_GREEN_CODE = 2;
const ASCII_YELLOW_CODE = 3;
const ASCII_BLUE_CODE = 4;
const ASCII_MAGENTA_CODE = 5;
const ASCII_CYAN_CODE = 6;
const ASCII_WHITE_CODE = 7;
const ASCII_LIGHT_BLACK_CODE = 8;
const ASCII_LIGHT_RED_CODE = 9;
const ASCII_LIGHT_GREEN_CODE = 10;
const ASCII_LIGHT_YELLOW_CODE = 11;
const ASCII_LIGHT_BLUE_CODE = 12;
const ASCII_LIGHT_MAGENTA_CODE = 13;
const ASCII_LIGHT_CYAN_CODE = 14;
const ASCII_LIGHT_WHITE_CODE = 15;
function formatFlagFromTag(tagStr) {
    tagStr = tagStr.toUpperCase();
    switch (tagStr) {
        case '/': return FormatFlag.RESET;
        case '!': return FormatFlag.INVERT;
        case 'U': return FormatFlag.UNDERLINE;
        case 'B': return FormatFlag.BOLD;
        case 'I': return FormatFlag.ITALIC;
        case 'GRAY': return FormatFlag.LIGHT_BLACK;
        case 'BG_GRAY': return FormatFlag.BG_LIGHT_BLACK;
        default: {
            let enumValue = FormatFlag[tagStr];
            return enumValue == null ? null : enumValue;
        }
    }
}
function getAsciiFormat(flag) {
    switch (flag) {
        case FormatFlag.RESET: return '\x1B[m';
        case FormatFlag.BOLD: return '\x1B[1m';
        case FormatFlag.DIM: return '\x1B[2m';
        case FormatFlag.ITALIC: return '\x1B[3m';
        case FormatFlag.UNDERLINE: return '\x1B[4m';
        case FormatFlag.BLINK: return '\x1B[5m';
        case FormatFlag.INVERT: return '\x1B[7m';
        case FormatFlag.HIDDEN: return '\x1B[8m';
        case FormatFlag.BLACK: return '\x1B[38;5;' + ASCII_BLACK_CODE + 'm';
        case FormatFlag.RED: return '\x1B[38;5;' + ASCII_RED_CODE + 'm';
        case FormatFlag.GREEN: return '\x1B[38;5;' + ASCII_GREEN_CODE + 'm';
        case FormatFlag.YELLOW: return '\x1B[38;5;' + ASCII_YELLOW_CODE + 'm';
        case FormatFlag.BLUE: return '\x1B[38;5;' + ASCII_BLUE_CODE + 'm';
        case FormatFlag.MAGENTA: return '\x1B[38;5;' + ASCII_MAGENTA_CODE + 'm';
        case FormatFlag.CYAN: return '\x1B[38;5;' + ASCII_CYAN_CODE + 'm';
        case FormatFlag.WHITE: return '\x1B[38;5;' + ASCII_WHITE_CODE + 'm';
        case FormatFlag.LIGHT_BLACK: return '\x1B[38;5;' + ASCII_LIGHT_BLACK_CODE + 'm';
        case FormatFlag.LIGHT_RED: return '\x1B[38;5;' + ASCII_LIGHT_RED_CODE + 'm';
        case FormatFlag.LIGHT_GREEN: return '\x1B[38;5;' + ASCII_LIGHT_GREEN_CODE + 'm';
        case FormatFlag.LIGHT_YELLOW: return '\x1B[38;5;' + ASCII_LIGHT_YELLOW_CODE + 'm';
        case FormatFlag.LIGHT_BLUE: return '\x1B[38;5;' + ASCII_LIGHT_BLUE_CODE + 'm';
        case FormatFlag.LIGHT_MAGENTA: return '\x1B[38;5;' + ASCII_LIGHT_MAGENTA_CODE + 'm';
        case FormatFlag.LIGHT_CYAN: return '\x1B[38;5;' + ASCII_LIGHT_CYAN_CODE + 'm';
        case FormatFlag.LIGHT_WHITE: return '\x1B[38;5;' + ASCII_LIGHT_WHITE_CODE + 'm';
        case FormatFlag.BG_BLACK: return '\x1B[48;5;' + ASCII_BLACK_CODE + 'm';
        case FormatFlag.BG_RED: return '\x1B[48;5;' + ASCII_RED_CODE + 'm';
        case FormatFlag.BG_GREEN: return '\x1B[48;5;' + ASCII_GREEN_CODE + 'm';
        case FormatFlag.BG_YELLOW: return '\x1B[48;5;' + ASCII_YELLOW_CODE + 'm';
        case FormatFlag.BG_BLUE: return '\x1B[48;5;' + ASCII_BLUE_CODE + 'm';
        case FormatFlag.BG_MAGENTA: return '\x1B[48;5;' + ASCII_MAGENTA_CODE + 'm';
        case FormatFlag.BG_CYAN: return '\x1B[48;5;' + ASCII_CYAN_CODE + 'm';
        case FormatFlag.BG_WHITE: return '\x1B[48;5;' + ASCII_WHITE_CODE + 'm';
        case FormatFlag.BG_LIGHT_BLACK: return '\x1B[48;5;' + ASCII_LIGHT_BLACK_CODE + 'm';
        case FormatFlag.BG_LIGHT_RED: return '\x1B[48;5;' + ASCII_LIGHT_RED_CODE + 'm';
        case FormatFlag.BG_LIGHT_GREEN: return '\x1B[48;5;' + ASCII_LIGHT_GREEN_CODE + 'm';
        case FormatFlag.BG_LIGHT_YELLOW: return '\x1B[48;5;' + ASCII_LIGHT_YELLOW_CODE + 'm';
        case FormatFlag.BG_LIGHT_BLUE: return '\x1B[48;5;' + ASCII_LIGHT_BLUE_CODE + 'm';
        case FormatFlag.BG_LIGHT_MAGENTA: return '\x1B[48;5;' + ASCII_LIGHT_MAGENTA_CODE + 'm';
        case FormatFlag.BG_LIGHT_CYAN: return '\x1B[48;5;' + ASCII_LIGHT_CYAN_CODE + 'm';
        case FormatFlag.BG_LIGHT_WHITE: return '\x1B[48;5;' + ASCII_LIGHT_WHITE_CODE + 'm';
        default: return '';
    }
}
function format(message) {
    let formatPattern = /<(\/)?([^><{}]*|{[^}<>]*})>/g;
    let activeFormatFlagStack = new Array();
    let groupedProceedingTags = new Array();
    function addFlag(flag, proceedingTags) {
        activeFormatFlagStack.push(flag);
        groupedProceedingTags.push(proceedingTags);
    }
    function removeFlag(flag) {
        let i = activeFormatFlagStack.indexOf(flag);
        if (i !== -1) {
            let proceedingTags = groupedProceedingTags[i];
            // remove n tags
            activeFormatFlagStack.splice(i - proceedingTags, proceedingTags + 1);
            groupedProceedingTags.splice(i - proceedingTags, proceedingTags + 1);
        }
    }
    function resetFlags() {
        activeFormatFlagStack = [];
        groupedProceedingTags = [];
    }
    let formatted = message.replace(formatPattern, (substr, closeModifier, tagStr) => {
        let open = closeModifier == null;
        let tags = tagStr.split(',').map((tag) => tag.trim());
        // handle </> and <//>
        if (!open && tags.length === 1) {
            if (tags[0] == '') {
                // we've got a shorthand to close the last tag: </>
                let last = activeFormatFlagStack[activeFormatFlagStack.length - 1];
                removeFlag(last);
            }
            else if (formatFlagFromTag(tags[0]) == FormatFlag.RESET) {
                resetFlags();
            }
            else {
                // handle </*>
                let flag = formatFlagFromTag(tags[0]);
                if (flag != null) {
                    removeFlag(flag);
                }
            }
        }
        else {
            let proceedingTags = 0;
            for (let tag of tags) {
                let flag = formatFlagFromTag(tag);
                if (flag == null)
                    return substr; // unhandled tag, don't treat as formatting
                if (open) {
                    addFlag(flag, proceedingTags);
                    proceedingTags++;
                }
                else {
                    removeFlag(flag);
                }
            }
        }
        // since format flags are cumulative, we only need to add the last item if it's an open tag
        if (open) {
            if (activeFormatFlagStack.length > 0) {
                let lastFlagCount = groupedProceedingTags[groupedProceedingTags.length - 1] + 1;
                let asciiFormatString = '';
                for (let i = 0; i < lastFlagCount; i++) {
                    let idx = groupedProceedingTags.length - 1 - i;
                    asciiFormatString += getAsciiFormat(activeFormatFlagStack[idx]);
                }
                return asciiFormatString;
            }
            else {
                return '';
            }
        }
        else {
            return getAsciiFormat(FormatFlag.RESET) + activeFormatFlagStack.map((f) => getAsciiFormat(f)).filter((s) => s != null).join('');
        }
    });
    return formatted;
}
