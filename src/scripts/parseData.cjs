const fs = require('fs');
const path = require('path');

/**
 * Parses flat custom drop string formats into an array of objects.
 */
function parseMakeList(value) {
    if (value === '{}' || !value) return [];

    const results = [];
    const regex = /\{\[([^\]]+)];([\d.]+);([\d.]+);([\d.]+)}/g;

    let match;
    while ((match = regex.exec(value)) !== null) {
        results.push({
            item: match[1],
            min_drop: Number(match[2]),
            max_drop: Number(match[3]),
            chance: Number(match[4])
        });
    }
    return results;
}

function parseMultiMakeList(value) {
    if (value === '{}' || !value) return [];

    const results = [];
    const groupRegex = /\{\{(.+?)};([\d.]+)}/g;
    const itemRegex = /\{\[([^\]]+)];([\d.]+);([\d.]+);([\d.]+)}/g;

    let groupMatch;
    let groupIndex = 0; // Tracks categories sequentially

    while ((groupMatch = groupRegex.exec(value)) !== null) {
        const itemsBlock = groupMatch[1];
        const groupChance = Number(groupMatch[2]);

        let itemMatch;
        itemRegex.lastIndex = 0;

        while ((itemMatch = itemRegex.exec(itemsBlock)) !== null) {
            const itemChance = Number(itemMatch[4]);
            const finalChance = (itemChance / 100) * groupChance;

            results.push({
                item: itemMatch[1],
                min_drop: Number(itemMatch[2]),
                max_drop: Number(itemMatch[3]),
                chance: finalChance,
                group_id: groupIndex,
                group_chance: groupChance,
                internal_chance: itemChance // 👈 ADD THIS: Keeps the raw unscaled percentage
            });
        }
        groupIndex++; // Move to next group container
    }
    return results;
}

/**
 * Converts custom tab-separated NPC data into structured JSON format.
 */
function convertNpcCsvToJson(inputPath, outputPath) {
    try {
        // 1. Read file as raw buffer to intelligently handle Game Data Encodings
        const buffer = fs.readFileSync(inputPath);
        let content = '';

        // Check for UTF-16 LE BOM (FF FE) - Extremely common in L2 files
        if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
            content = buffer.toString('utf16le');
        } else {
            content = buffer.toString('utf8');
        }

        // 2. Strip UTF-8 BOM if present so it doesn't attach to the first word
        content = content.replace(/^\uFEFF/, '');

        const lines = content.split(/\r?\n/);
        const jsonData = [];

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const parts = line.split('\t');

            // 3. Safely trim the first part to ignore random spaces or invisible characters
            const rowIdentifier = parts[0] ? parts[0].trim() : '';

            if (rowIdentifier === 'npc_begin') {
                const item = {
                    type: parts[1] ? parts[1].trim() : '',
                    id: parts[2] ? parts[2].trim() : '',
                    name: parts[3] ? parts[3].trim() : ''
                };

                for (let i = 4; i < parts.length; i++) {
                    const part = parts[i];
                    if (part === 'npc_end') break;

                    const equalSignIndex = part.indexOf('=');
                    if (equalSignIndex !== -1) {
                        const key = part.substring(0, equalSignIndex).trim();
                        const value = part.substring(equalSignIndex + 1).trim();

                        if (key === 'corpse_make_list') {
                            item['spoil'] = parseMakeList(value);
                        }
                        else if (key === 'additional_make_multi_list') {
                            item['drop'] = parseMultiMakeList(value);
                        } else if (key === 'additional_make_list') {
                            item[key] = parseMakeList(value);
                        } else {
                            item[key] = value;
                        }
                    }
                }
                jsonData.push(item);
            }
        }

        // Write output
        fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');
        console.log(`Success: Successfully converted ${jsonData.length} rows to ${outputPath}`);

        // Debugging hint if it still fails
        if (jsonData.length === 0) {
            console.log("\n[Debug] The script still found 0 rows. Here is how the first line is being read by Node.js:");
            console.log(lines[0]);
        }

    } catch (error) {
        console.error('An error occurred during file conversion:', error.message);
    }
}

// Execution
const csvFile = path.join(__dirname + '/../data', 'npcdata.csv');
const jsonOutputFile = path.join(__dirname, '..', '..', 'public', 'npcdata_parsed.json');

convertNpcCsvToJson(csvFile, jsonOutputFile);