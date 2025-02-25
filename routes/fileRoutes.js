const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph } = require('docx');

const router = express.Router();

const getFilePath = (fileName) => {
    if (!fileName.endsWith('.docx')) {
        throw new Error('Invalid file type , Only .docx files are allowed.');
    }
    return path.join(__dirname, '..', 'storage', path.basename(fileName));
};

// Read file
router.get('/read', async (req, res) => {
    try {
        const filePath = getFilePath(req.query.fileName);
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        res.json({ content: result.value });
    } catch (err) {
        res.status(404).json({ error: err.message || 'File not found' });
    }
});

// Write file
router.post('/write', async (req, res) => {
    const { fileName, content } = req.body;
    try {
        const filePath = getFilePath(fileName);
        const doc = new Document({
            sections: [{
                properties: {},
                children: [new Paragraph(content)],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile(filePath, buffer);
        res.json({ message: 'Word file created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Append to file
router.post('/append', async (req, res) => {
  const { fileName, content } = req.body;
  try {
      const filePath = getFilePath(fileName);
      const existingBuffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: existingBuffer });
      
      const newDoc = new Document({
          sections: [{
              properties: {},
              children: [new Paragraph(result.value + '\n' + content)],
          }],
      });

      const buffer = await Packer.toBuffer(newDoc);
      await fs.writeFile(filePath, buffer);
      res.json({ message: 'Content appended successfully' });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// Delete file
router.delete('/delete', async (req, res) => {
    try {
        const filePath = getFilePath(req.query.fileName);
        await fs.unlink(filePath);
        res.json({ message: 'Word file deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rename file
router.put('/rename', async (req, res) => {
    const { oldName, newName } = req.body;

    try {
        if (!newName.endsWith('.docx')) {
            throw new Error('New file name must have .docx extension');
        }

        const oldFilePath = getFilePath(oldName);
        const newFilePath = getFilePath(newName);

        await fs.access(oldFilePath);
        await fs.rename(oldFilePath, newFilePath);

        res.json({ message: 'Word file renamed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/create-dir', async (req, res) => {
  const { dirName } = req.body;

  if (!dirName) {
    return res.status(400).json({ error: 'Directory name is required' });
  }

  const dirPath = getFilePath(dirName);

  try {
    await fs.mkdir(dirPath, { recursive: true }); // Creates nested directories if needed
    res.json({ message: 'Directory created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/delete-dir', async (req, res) => {
  const { dirName } = req.query;

  if (!dirName) {
    return res.status(400).json({ error: 'Directory name is required' });
  }

  const dirPath = getFilePath(dirName);

  try {
    await fs.rm(dirPath, { recursive: true, force: true }); // Deletes even if it's not empty
    res.json({ message: 'Directory deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;