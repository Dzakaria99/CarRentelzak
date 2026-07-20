import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cleanupUploadedFile } from "../middleware/multer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Upload image to ImageKit when configured; otherwise store locally under /uploads.
 */
export const storeDocumentImage = async (file, folder = "/booking-docs") => {
  if (!file?.path) throw new Error("No file provided");

  const hasImageKit =
    process.env.IMAGEKIT_PUBLIC_KEY &&
    process.env.IMAGEKIT_PRIVATE_KEY &&
    process.env.IMAGEKIT_URL_ENDPOINT;

  if (hasImageKit) {
    try {
      const fileBuffer = fs.readFileSync(file.path);
      const response = await imagekit.upload({
        file: fileBuffer,
        fileName: file.originalname || `doc-${Date.now()}.jpg`,
        folder,
      });
      cleanupUploadedFile(file);
      return imagekit.url({
        path: response.filePath,
        transformation: [{ width: "1600" }, { quality: "auto" }],
      });
    } catch (error) {
      console.error("ImageKit document upload failed, falling back to local:", error.message);
    }
  }

  const reservationFolder = path.join(__dirname, "..", "uploads", "documents", "files");
  if (!fs.existsSync(reservationFolder)) fs.mkdirSync(reservationFolder, { recursive: true });
  const ext = path.extname(file.originalname || "") || ".jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dest = path.join(reservationFolder, name);
  fs.renameSync(file.path, dest);

  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
  return `${base}/uploads/documents/files/${name}`;
};

export const storeDataUrlImage = async (dataUrl, fileName = "signature.png") => {
  if (!dataUrl?.startsWith("data:image")) throw new Error("Invalid image data");
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid data URL");
  const buffer = Buffer.from(matches[2], "base64");
  const tmpDir = path.join(__dirname, "..", "uploads", "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${Date.now()}-${fileName}`);
  fs.writeFileSync(tmpPath, buffer);
  const fakeFile = { path: tmpPath, originalname: fileName };
  return storeDocumentImage(fakeFile, "/booking-signatures");
};

export default { storeDocumentImage, storeDataUrlImage };
