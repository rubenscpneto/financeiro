import { createRequire } from "node:module"
import { join } from "node:path"

const require = createRequire(join(process.cwd(), "package.json"))

function samplePdf() {
  const text = "13/03/2026 PADARIA CENTRAL 32,90"
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET\n`
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ]
  let body = "%PDF-1.4\n"
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body, "latin1"))
    body += object
  }
  const xrefStart = Buffer.byteLength(body, "latin1")
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
  }
  body += xref
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(body, "latin1")
}

const canvas = require("@napi-rs/canvas")
if (!canvas?.DOMMatrix) {
  throw new Error("@napi-rs/canvas loaded but DOMMatrix is missing")
}
globalThis.DOMMatrix = canvas.DOMMatrix
globalThis.ImageData = canvas.ImageData
globalThis.Path2D = canvas.Path2D

const { PDFParse } = await import(require.resolve("pdf-parse"))
const parser = new PDFParse({ data: samplePdf() })
try {
  const { text } = await parser.getText({ lineEnforce: true, cellSeparator: " " })
  if (!/PADARIA CENTRAL/.test(text) || !/13\/03\/2026/.test(text)) {
    throw new Error(`PDF text missing expected content: ${JSON.stringify(text)}`)
  }
  console.log("pdf-parse ok", text.replace(/\s+/g, " ").trim())
} finally {
  await parser.destroy()
}
