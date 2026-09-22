const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { decryptPDF } = require('@pdfsmaller/pdf-decrypt');

const app = express();
const PORT = 3210;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: path.join(__dirname, 'temp') });
if (!fs.existsSync(path.join(__dirname, 'temp'))) {
  fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });
}

app.post('/unlock-pdf', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const password = req.body.password || '';
    const bytes = fs.readFileSync(filePath);

    const decrypted = await decryptPDF(bytes, password);

    fs.unlinkSync(filePath);
    const originalName = req.file.originalname;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${originalName.replace('.pdf', '_desbloqueado.pdf')}"`,
    });
    res.send(Buffer.from(decrypted));
  } catch (err) {
    try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PDF Unlock Server running on http://localhost:${PORT}`);
});
