import dotenv from "dotenv";

export const config = {
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") || "http://localhost:5173",
};


