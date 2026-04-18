const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const profilesDir = path.join(uploadsDir, 'profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

// ================= UPLOAD PROFILE IMAGE =================
// Accepts either:
// 1. JSON with base64 encoded image (e.g., {"file": "data:image/jpeg;base64,..."})
// Note: FormData is NOT supported (use JSON with base64 for better compatibility)
router.post('/profile-image', async (req, res) => {
  try {
    console.log('[UPLOAD] Content-Type:', req.headers['content-type']);
    
    // Handle JSON with base64 data (from admin/users page and ProfileCard)
    if (req.body && req.body.file) {
      const fileData = req.body.file;
      const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const ext = fileData.match(/data:image\/(\w+)/)?.[1] || 'jpg';
      const fileName = `profile-${Date.now()}.${ext}`;
      const filePath = path.join(profilesDir, fileName);
      
      fs.writeFileSync(filePath, buffer);
      
      const url = `/uploads/profiles/${fileName}`;
      console.log('[UPLOAD] Profile image uploaded:', url);
      
      return res.json({ url });
    }
    
    res.status(400).json({ error: 'No file data provided. Send JSON with base64 image.' });
    
  } catch (err) {
    console.error('[UPLOAD ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded files statically
router.get('/profiles/:filename', (req, res) => {
  const filePath = path.join(profilesDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router;