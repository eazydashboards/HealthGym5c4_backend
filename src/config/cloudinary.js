import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dyhjzo9l",
  api_key: process.env.CLOUDINARY_API_KEY || "327929639922995",
  api_secret: process.env.CLOUDINARY_API_SECRET || "m8NXDUFIOpIrHHjVEJdTRgNMJ3Q",
});

export const uploadMemberPhoto = async (base64Data, memberRegNo = "member") => {
  if (!base64Data || !base64Data.startsWith("data:image/")) {
    return null;
  }

  const result = await cloudinary.uploader.upload(base64Data, {
    folder: "health_gym_members",
    public_id: `${memberRegNo.toLowerCase()}_${Date.now()}`,
    transformation: [
      { width: 350, height: 350, crop: "fill", gravity: "face" },
      { quality: "auto:eco", fetch_format: "auto" },
    ],
  });

  return result.secure_url;
};

export default cloudinary;
