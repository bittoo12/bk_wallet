import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// S3 client setup for DigitalOcean Spaces
const s3 = new S3Client({
  region: 'blr1',
  endpoint: 'https://blr1.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env.DO_ACCESS_KEY,
    secretAccessKey: process.env.DO_SECRET_KEY,
  },
});

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const fileExt = mime.extension(req.file.mimetype);
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const s3Key = `uploads/${uniqueFileName}`;

    const params = {
      Bucket: 'globalwalletspacedev',
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    };

    await s3.send(new PutObjectCommand(params));

    const fileUrl = `https://globalwalletspacedev.blr1.digitaloceanspaces.com/${s3Key}`;
    res.json({ message: 'Upload successful', url: fileUrl });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

export default router;
