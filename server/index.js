const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const app = express();
const PORT = 3210;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: path.join(__dirname, 'temp') });
if (!fs.existsSync(path.join(__dirname, 'temp'))) {
  fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });
}

const PADDING = Buffer.from([0x28,0xBF,0x4E,0x5E,0x4E,0x75,0x8A,0x41,0x64,0x00,0x4E,0x56,0xFF,0xFA,0x01,0x08,0x2E,0x2E,0x00,0xB6,0xD0,0x68,0x3E,0x80,0x2F,0x0C,0xA9,0xFE,0x64,0x53,0x69,0x7A]);

function padPassword(pw) {
  const buf = Buffer.alloc(32);
  const len = Math.min(pw.length, 32);
  pw.copy(buf, 0, 0, len);
  for (let i = len; i < 32; i++) buf[i] = PADDING[i];
  return buf;
}

function deriveKey(password, oHex, p, idHex) {
  const pwBuf = padPassword(Buffer.from(password));
  let md5 = forge.md5.create();
  md5.update(pwBuf);
  // O string - use first 32 bytes
  const oBuf = Buffer.from(oHex, 'binary');
  md5.update(oBuf.subarray(0, 32));
  // Permissions as 4-byte little-endian
  const permBuf = Buffer.alloc(4);
  permBuf.writeInt32LE(p, 0);
  md5.update(permBuf);
  // ID
  if (idHex && idHex.length >= 32) {
    md5.update(Buffer.from(idHex.substring(0, 32), 'binary'));
  }
  let key = md5.digest().bytes;
  // For revision >= 3, iterate 50 times
  for (let i = 0; i < 50; i++) {
    md5 = forge.md5.create();
    md5.update(key);
    key = md5.digest().bytes;
  }
  return key.subarray(0, Math.min(key.length(), 16));
}

function rc4Decrypt(key, data) {
  const cipher = forge.cipher.createCipher('RC4', key);
  cipher.start({ iv: null });
  cipher.update(forge.util.createBuffer(data));
  cipher.finish();
  return Buffer.from(cipher.output.bytes);
}

function parsePdfEncryptDict(data) {
  const oMatch = data.match(/\/O\s*\(([\s\S]*?)\)\s*[\/\n]/);
  const pMatch = data.match(/\/P\s*(-?\d+)/);
  const idMatch = data.match(/\/ID\s*\[\s*<\s*([0-9A-Fa-f\s]+?)\s*>[\s\S]*?<([0-9A-Fa-f\s]+?)>\s*\]/);
  const filterMatch = data.match(/\/Filter\s*\/Standard/);
  const rMatch = data.match(/\/R\s*(\d+)/);
  const lengthMatch = data.match(/\/Length\s*(\d+)/);

  if (!oMatch || !pMatch || !filterMatch) return null;

  return {
    o: oMatch[1],
    p: parseInt(pMatch[1]),
    id: idMatch ? idMatch[1] : '',
    r: rMatch ? parseInt(rMatch[1]) : 2,
    length: lengthMatch ? parseInt(lengthMatch[1]) : 40,
  };
}

app.post('/unlock-pdf', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const password = req.body.password || '';
    const bytes = fs.readFileSync(filePath);
    const data = bytes.toString('binary');

    // Try without encryption first
    try {
      // Quick check: try to parse as normal PDF
      const { PDFDocument } = require('pdf-lib');
      await PDFDocument.load(bytes);
      const pdfBytes = await PDFDocument.load(bytes).then(d => d.save({ useObjectStreams: false }));
      fs.unlinkSync(filePath);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${req.file.originalname.replace('.pdf', '_desbloqueado.pdf')}"` });
      return res.send(Buffer.from(pdfBytes));
    } catch (e) {
      // Encrypted — proceed
    }

    // Parse encryption dictionary
    const enc = parsePdfEncryptDict(data);
    if (!enc) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'No se encontró el diccionario de encriptación /O /P /Filter /Standard en el PDF' });
    }

    // Derive key
    const key = deriveKey(password, enc.o, enc.p, enc.id);
    const keyHex = key.toString('binary');

    // Decrypt all streams by finding and RC4-decrypting each stream
    // This is a simplified approach: find streams in the PDF and decrypt them
    const decrypted = data.replace(/\/Filter\s*\/FlateDecode[\s\S]*?stream\r?\n([\s\S]*?)\r?\nendstream/g, (match, streamContent) => {
      const streamBuf = Buffer.from(streamContent, 'binary');
      const decryptedStream = rc4Decrypt(key, streamBuf);
      return `stream\r\n${decryptedStream.toString('binary')}\r\nendstream`;
    });

    if (decrypted === data) {
      // No streams found or already decrypted
      // Try using pdf-lib copyPages
      const { PDFDocument } = require('pdf-lib');
      try {
        const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        const newPdf = await PDFDocument.create();
        const indices = pages.map((_, i) => i);
        const copied = await newPdf.copyPages(pdfDoc, indices);
        for (const page of copied) await newPdf.addPage(page);
        const pdfBytes = await newPdf.save({ useObjectStreams: false });
        fs.unlinkSync(filePath);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${req.file.originalname.replace('.pdf', '_desbloqueado.pdf')}"` });
        return res.send(Buffer.from(pdfBytes));
      } catch (copyErr) {
        fs.unlinkSync(filePath);
        return res.status(500).json({ error: 'No se pudo desbloquear el PDF. El PDF podría usar un método de encriptación avanzado que requiere pikepdf (Python).' });
      }
    }

    // Write decrypted PDF
    const outPath = filePath + '.dec';
    fs.writeFileSync(outPath, Buffer.from(decrypted, 'binary'));
    fs.unlinkSync(filePath);
    fs.renameSync(outPath, filePath);

    // Verify by loading with pdf-lib
    try {
      const { PDFDocument } = require('pdf-lib');
      await PDFDocument.load(fs.readFileSync(filePath));
      const pdfBytes = fs.readFileSync(filePath);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${req.file.originalname.replace('.pdf', '_desbloqueado.pdf')}"` });
      return res.send(pdfBytes);
    } catch (e) {
      fs.unlinkSync(filePath);
      // Fall back to copyPages
      try {
        const { PDFDocument } = require('pdf-lib');
        const pdfDoc = await PDFDocument.load(Buffer.from(decrypted, 'binary'), { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        const newPdf = await PDFDocument.create();
        const indices = pages.map((_, i) => i);
        const copied = await newPdf.copyPages(pdfDoc, indices);
        for (const page of copied) await newPdf.addPage(page);
        const pdfBytes = await newPdf.save({ useObjectStreams: false });
        return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${req.file.originalname.replace('.pdf', '_desbloqueado.pdf')}"` }).send(Buffer.from(pdfBytes));
      } catch (copyErr) {
        return res.status(500).json({ error: 'El PDF usa encriptación avanzada (RC4 con longitud > 128 bits o AES). Se requiere pikepdf (Python) o qpdf (CLI).' });
      }
    }
  } catch (err) {
    try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PDF Unlock Server running on http://localhost:${PORT}`);
});
