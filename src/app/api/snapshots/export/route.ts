import { NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const SAFE_FILENAME = /^snapshot_\d{8}_\d{6}\.jpg$/;

// Simple ZIP file creation without external dependencies
// Uses the ZIP format spec: local file headers + central directory + end record
function createZip(files: { name: string; data: Buffer }[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralEntries: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, "utf-8");
    const crc = crc32(file.data);

    // Local file header
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);  // signature
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0, 6);            // flags
    local.writeUInt16LE(0, 8);            // compression (store)
    local.writeUInt16LE(0, 10);           // mod time
    local.writeUInt16LE(0, 12);           // mod date
    local.writeUInt32LE(crc, 14);         // crc-32
    local.writeUInt32LE(file.data.length, 18); // compressed size
    local.writeUInt32LE(file.data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuffer.length, 26); // filename length
    local.writeUInt16LE(0, 28);           // extra field length
    nameBuffer.copy(local, 30);

    localHeaders.push(local, file.data);

    // Central directory entry
    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0);  // signature
    central.writeUInt16LE(20, 4);           // version made by
    central.writeUInt16LE(20, 6);           // version needed
    central.writeUInt16LE(0, 8);            // flags
    central.writeUInt16LE(0, 10);           // compression
    central.writeUInt16LE(0, 12);           // mod time
    central.writeUInt16LE(0, 14);           // mod date
    central.writeUInt32LE(crc, 16);         // crc-32
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);           // extra field length
    central.writeUInt16LE(0, 32);           // comment length
    central.writeUInt16LE(0, 34);           // disk start
    central.writeUInt16LE(0, 36);           // internal attrs
    central.writeUInt32LE(0, 38);           // external attrs
    central.writeUInt32LE(offset, 42);      // local header offset
    nameBuffer.copy(central, 46);

    centralEntries.push(central);
    offset += local.length + file.data.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralEntries.reduce((s, b) => s + b.length, 0);

  // End of central directory
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirSize, 12);
  endRecord.writeUInt32LE(centralDirOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralEntries, endRecord]);
}

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // optional: YYYY-MM-DD filter
  const config = getConfig();

  if (!existsSync(config.imageDir)) {
    return NextResponse.json({ error: "No snapshots found" }, { status: 404 });
  }

  let filenames = readdirSync(config.imageDir).filter((f) => SAFE_FILENAME.test(f));

  if (date) {
    const datePrefix = `snapshot_${date.replace(/-/g, "")}`;
    filenames = filenames.filter((f) => f.startsWith(datePrefix));
  }

  if (filenames.length === 0) {
    return NextResponse.json({ error: "No snapshots match the filter" }, { status: 404 });
  }

  // Limit to 500 files to prevent memory issues
  filenames = filenames.slice(0, 500);

  const files = filenames.map((name) => ({
    name,
    data: readFileSync(path.join(config.imageDir, name)),
  }));

  const zip = createZip(files);
  const exportDate = date || new Date().toISOString().split("T")[0];

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="snapshotr-${exportDate}.zip"`,
    },
  });
}
