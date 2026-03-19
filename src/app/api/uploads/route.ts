import { handleUploadDelete, handleUploadGet, handleUploadPost } from "@/lib/uploadApi";

export const runtime = "nodejs";

export const GET = handleUploadGet;
export const POST = handleUploadPost;
export const DELETE = handleUploadDelete;
