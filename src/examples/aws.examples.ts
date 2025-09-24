import { FastifyRequest, FastifyReply } from "fastify";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import s3Client, { S3_BUCKET, getS3Url } from "../config/s3";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

//Upload Multiple Images
export const uploadPhotos = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  // Verificar se é multipart
  if (!req.isMultipart()) {
    return reply.status(400).send({ message: "Request is not multipart" });
  }
  const uploadedFiles = [];
  const files = await req.saveRequestFiles();

  for (const file of files) {
    const fileExt = path.extname(file.filename);
    const uniqueFilename = `${crypto
      .randomBytes(16)
      .toString("hex")}${fileExt}`;
    const imagePath = `images/${uniqueFilename}`;

    try {
      // Upload to S3
      const fileContent = fs.readFileSync(file.filepath);
      const uploadParams = {
        Bucket: S3_BUCKET,
        Key: imagePath,
        Body: fileContent,
        ContentType: file.mimetype,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      // Clean up the temporary file
      fs.unlinkSync(file.filepath);

      const photos = [
        {
          path: imagePath,
          id: "1234-12345-12345",
        },
      ];

      uploadedFiles.push({ path: photos[0].path, photoId: photos[0].id });
    } catch (error) {
      console.error("Error handling photo upload:", error);
      // Clean up any files that were uploaded
      for (const uploadedFile of uploadedFiles) {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: S3_BUCKET,
              Key: uploadedFile.path,
            })
          );
        } catch (deleteError) {
          console.error("Error deleting file from S3:", deleteError);
        }
      }
    }
  }
};

//Upload a single File
export const uploadAvatar = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  if (!req.isMultipart()) {
    return reply.status(400).send({ message: "Request is not multipart" });
  }
  // Get all files from the request
  const files = await req.saveRequestFiles();
  const file = files[0]; // Get the first file if any

  if (!file) {
    return reply.status(400).send({ message: "No file uploaded" });
  }

  try {
    // Gerar nome único para o arquivo
    const fileExt = path.extname(file.filename);
    const uniqueFilename = `${crypto
      .randomBytes(16)
      .toString("hex")}${fileExt}`;

    const avatarPath = `avatars/${uniqueFilename}`;

    // Upload to S3
    const fileContent = fs.readFileSync(file.filepath);
    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: avatarPath,
      Body: fileContent,
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Clean up the temporary file
    fs.unlinkSync(file.filepath);
  } catch (error) {
    console.error("Error handling Image upload:", error);
  }
};
